/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * WebGPU point-sprite renderer with 2D and 3D modes.
 *
 * - 2D mode: orthographic, drag = pan, wheel = zoom
 * - 3D mode: perspective, drag = orbit rotate, ctrl+drag = pan, wheel = zoom
 * - Double-click or `resetView()` to auto-fit
 *
 * Renders point clouds using instanced quad rendering with smooth
 * circle fragment shading. Designed for real-time UMAP embedding animation.
 */

import { getDevice } from './webgpu_context';

// ── WGSL Shader ─────────────────────────────────────────────────

const SHADER = /* wgsl */ `
struct Uniforms {
  mvp: mat4x4f,
  resolution: vec2f,
  pointSize: f32,
  fogStrength: f32,
  fogColor: vec3f,       // align 16 — matches background
  depthNear: f32,
  depthFar: f32,
  opacity: f32,
  _pad1: f32,
  _pad2: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
  @location(2) fog: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vs_main(
  @location(0) quadCorner: vec2f,
  @location(1) pointPos: vec3f,
  @location(2) pointColor: vec4f,
) -> VertexOutput {
  var out: VertexOutput;

  // Transform data position to clip space
  var clip = u.mvp * vec4f(pointPos, 1.0);

  // Linear depth fog: clip.w = -eye_z (positive for visible geometry)
  let depthRange = max(u.depthFar - u.depthNear, 0.001);
  let linearDepth = clamp((clip.w - u.depthNear) / depthRange, 0.0, 1.0);
  out.fog = linearDepth * u.fogStrength;

  // Billboard: depth-scaled point size in 3D, constant in 2D.
  // Reference depth = midpoint of near/far → size = 1× there, larger closer, smaller farther.
  let refDepth = (u.depthNear + u.depthFar) * 0.5;
  let depthScale = select(1.0, refDepth / max(clip.w, 0.001), u.depthFar > u.depthNear + 0.01);
  let scaledSize = u.pointSize * depthScale;
  let pixelOffset = quadCorner * scaledSize * 2.0 / u.resolution;
  clip.x += pixelOffset.x * clip.w;
  clip.y += pixelOffset.y * clip.w;

  out.position = clip;
  out.color = pointColor;
  out.uv = quadCorner;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let dist = length(in.uv);
  if (dist > 1.0) {
    discard;
  }
  let edge = 1.0 - smoothstep(0.55, 1.0, dist);

  // Alpha test: discard the soft edge of the circle so the depth buffer
  // only writes for the solid center, preventing halo artifacts.
  // This must test the shape (edge) only, not opacity/fog.
  if (edge < 0.5) {
    discard;
  }

  // Depth fog: blend color toward background, reduce alpha slightly
  let foggedColor = mix(in.color.rgb, u.fogColor, in.fog);
  let finalAlpha = in.color.a * u.opacity * (1.0 - in.fog * 0.3) * edge;

  return vec4f(foggedColor, finalAlpha);
}
`;

// ── Matrix math (column-major for WGSL) ─────────────────────────

type V3 = [number, number, number];

function v3sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function v3cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function v3dot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function v3normalize(v: V3): V3 {
  const len = Math.sqrt(v3dot(v, v)) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function mat4Multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/** Perspective projection (WebGPU clip-Z [0,1]). */
function mat4Perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovY / 2);
  const rangeInv = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = far * rangeInv; // WebGPU Z: [0,1]
  m[11] = -1;
  m[14] = near * far * rangeInv;
  return m;
}

/** Look-at view matrix. */
function mat4LookAt(eye: V3, target: V3, up: V3): Float32Array {
  const zAxis = v3normalize(v3sub(eye, target));
  const xAxis = v3normalize(v3cross(up, zAxis));
  const yAxis = v3cross(zAxis, xAxis);
  const m = new Float32Array(16);
  m[0] = xAxis[0];
  m[1] = yAxis[0];
  m[2] = zAxis[0];
  m[3] = 0;
  m[4] = xAxis[1];
  m[5] = yAxis[1];
  m[6] = zAxis[1];
  m[7] = 0;
  m[8] = xAxis[2];
  m[9] = yAxis[2];
  m[10] = zAxis[2];
  m[11] = 0;
  m[12] = -v3dot(xAxis, eye);
  m[13] = -v3dot(yAxis, eye);
  m[14] = -v3dot(zAxis, eye);
  m[15] = 1;
  return m;
}

// ── Helpers ─────────────────────────────────────────────────────

function hexToRGB(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

// ── Public types ────────────────────────────────────────────────

export interface WebGPURendererOptions {
  /** Background clear color [r,g,b,a] in 0..1.  Default: dark slate #1e293b */
  backgroundColor?: [number, number, number, number];
  /** Point radius in pixels.  Default: 3 */
  pointSize?: number;
}

// ── Renderer ────────────────────────────────────────────────────

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private gpuContext: GPUCanvasContext | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private bindGroup: GPUBindGroup | null = null;

  private uniformBuffer: GPUBuffer | null = null;
  private quadBuffer: GPUBuffer | null = null;
  private positionBuffer: GPUBuffer | null = null;
  private colorBuffer: GPUBuffer | null = null;
  private depthTexture: GPUTexture | null = null;
  private depthTextureView: GPUTextureView | null = null;

  private pointCount = 0;

  /** Point radius in pixels. Writable at any time. */
  pointSize: number;
  /** Fog intensity for 3D depth cue (0 = off, 1 = full). Default: 0.7. Only affects 3D mode. */
  fogStrength = 0.7;
  /** Global point opacity (0..1). Default: 1.0 (opaque). */
  opacity = 1.0;
  private backgroundColor: [number, number, number, number];

  /** Current dimensionality: 2 or 3. Set automatically by setEmbedding. */
  dimensions: 2 | 3 = 2;

  // ── 2D view state ──
  private center2d: [number, number] = [0, 0];
  private scale2d = 1; // pixels per data-unit
  private fitScale2d = 1; // scale at auto-fit (for zoom limits)

  // ── 3D view state ──
  private target3d: V3 = [0, 0, 0];
  private cameraDist = 5;
  private fitCameraDist = 5; // cameraDist at auto-fit (for zoom limits)

  // ── Smooth zoom animation ──
  private zoomTarget2d = 1;
  private zoomTargetDist = 5;
  private zoomAnimId: number | null = null;
  private rotX = -0.4; // pitch  (radians)
  private rotY = 0.6; // yaw    (radians)

  // ── Auto-rotation ──
  /** Enable slow horizontal rotation in 3D mode. Default: true. */
  autoRotate = true;
  /** Rotation speed in radians per second. Default: 0.15. */
  autoRotateSpeed = 0.05;
  private autoRotateAnimId: number | null = null;
  private autoRotateLastTime = 0;

  // ── Data bounding box ──
  private dataMin: V3 = [0, 0, 0];
  private dataMax: V3 = [1, 1, 1];

  // ── Interaction ──
  private userInteracted = false;
  private isDragging = false;
  private dragMode: 'rotate' | 'pan' | 'select' = 'rotate';
  private lastMouse: [number, number] = [0, 0];
  private abortController: AbortController | null = null;

  // ── Selection ──
  private selectionStart: [number, number] | null = null;
  private selectionOverlay: HTMLDivElement | null = null;
  private positionsCache: Float32Array | null = null; // last written positions
  /** Currently selected point indices. Empty = no selection (all visible). */
  selectedIndices: Set<number> = new Set();
  /** Callback fired when selection changes. Receives the set of selected indices. */
  onSelect: ((indices: Set<number>) => void) | null = null;
  /** Callback fired when a cluster label is clicked. Receives the cluster index. */
  onLabelClick: ((clusterIndex: number) => void) | null = null;
  /** Dim factor for non-selected points (0 = invisible, 1 = normal). */
  selectionDimFactor = 0.15;
  private colorsCache: Float32Array | null = null; // original colours

  // ── Cluster labels ──
  private labelsCache: number[] | null = null;
  private labelNames: string[] | null = null;
  private labelOverlayContainer: HTMLDivElement | null = null;
  private labelElements: HTMLDivElement[] = [];
  /** Whether to show cluster centroid labels. Default: true. */
  showLabels = true;
  /** Cluster whose label stays prominent while the others fade. `null` = no highlight. */
  highlightedLabel: number | null = null;

  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: WebGPURendererOptions = {}) {
    this.canvas = canvas;
    this.pointSize = options.pointSize ?? 3;
    this.backgroundColor = options.backgroundColor ?? [0.118, 0.161, 0.231, 1];
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /** Initialize the WebGPU context and render pipeline. Returns `false` if unavailable. */
  async init(): Promise<boolean> {
    this.device = await getDevice();
    if (!this.device) return false;

    this.gpuContext = this.canvas.getContext('webgpu') as GPUCanvasContext;
    if (!this.gpuContext) return false;

    const format = navigator.gpu.getPreferredCanvasFormat();
    this.gpuContext.configure({
      device: this.device,
      format,
      alphaMode: 'premultiplied',
    });

    const shaderModule = this.device.createShaderModule({ code: SHADER });

    // Quad corners (triangle-strip: 4 verts -> 2 triangles)
    const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.quadBuffer = this.device.createBuffer({
      size: quadVerts.byteLength,
      usage: GPUBufferUsage.VERTEX + GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.quadBuffer, 0, quadVerts);

    // Uniform buffer: mvp(64) + res(8) + ptSize(4) + fog(4) + fogColor(12) + depth(8) + pad(12) = 112
    this.uniformBuffer = this.device.createBuffer({
      size: 112,
      usage: GPUBufferUsage.UNIFORM + GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX + GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            // slot 0 — quad corners (per-vertex)
            arrayStride: 8,
            stepMode: 'vertex' as GPUVertexStepMode,
            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' as GPUVertexFormat }],
          },
          {
            // slot 1 — point positions vec3f (per-instance)
            arrayStride: 12,
            stepMode: 'instance' as GPUVertexStepMode,
            attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' as GPUVertexFormat }],
          },
          {
            // slot 2 — point colours (per-instance)
            arrayStride: 16,
            stepMode: 'instance' as GPUVertexStepMode,
            attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x4' as GPUVertexFormat }],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
              },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-strip' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
    });

    this.ensureDepthTexture();
    this.setupMouseEvents();
    return true;
  }

  /** Change the background clear color [r,g,b,a] in 0..1; also used as the 3D fog color. */
  setBackgroundColor(color: [number, number, number, number]): void {
    this.backgroundColor = color;
  }

  /** Release all GPU resources and remove event listeners. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.zoomAnimId !== null) {
      cancelAnimationFrame(this.zoomAnimId);
      this.zoomAnimId = null;
    }
    if (this.autoRotateAnimId !== null) {
      cancelAnimationFrame(this.autoRotateAnimId);
      this.autoRotateAnimId = null;
    }
    this.selectionOverlay?.remove();
    this.labelElements.forEach((el) => el.remove());
    this.labelOverlayContainer?.remove();
    this.abortController?.abort();
    this.positionBuffer?.destroy();
    this.colorBuffer?.destroy();
    this.quadBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.depthTexture?.destroy();
  }

  /** Create or recreate the depth texture to match the current canvas size. */
  private ensureDepthTexture(): void {
    if (!this.device) return;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Skip if already the right size
    if (this.depthTexture && this.depthTexture.width === w && this.depthTexture.height === h)
      return;

    this.depthTexture?.destroy();
    this.depthTexture = this.device.createTexture({
      size: [w, h],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.depthTextureView = this.depthTexture.createView();
  }

  // ── Data ──────────────────────────────────────────────────────

  /**
   * Low-level: set raw position + colour buffers.
   * Positions must be vec3f: flat [x0,y0,z0, x1,y1,z1, …]
   */
  setData(positions: Float32Array, colors: Float32Array, count: number): void {
    if (!this.device) return;

    this.computeBounds(positions, count);

    // Position buffer (vec3f = 12 bytes per point)
    this.positionBuffer?.destroy();
    this.positionBuffer = this.device.createBuffer({
      size: Math.max(count * 12, 4),
      usage: GPUBufferUsage.VERTEX + GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(
      this.positionBuffer,
      0,
      positions.buffer as ArrayBuffer,
      0,
      count * 3 * 4
    );

    // Colour buffer
    this.colorBuffer?.destroy();
    this.colorBuffer = this.device.createBuffer({
      size: Math.max(count * 16, 4),
      usage: GPUBufferUsage.VERTEX + GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(
      this.colorBuffer,
      0,
      colors.buffer as ArrayBuffer,
      0,
      count * 4 * 4
    );

    this.positionsCache = new Float32Array(positions.buffer.slice(0, count * 3 * 4));
    this.colorsCache = new Float32Array(colors.buffer.slice(0, count * 4 * 4));
    this.selectedIndices = new Set();
    this.pointCount = count;
    this.userInteracted = false;
    this.fitToData();
  }

  /**
   * Update only the position buffer (e.g. during UMAP animation).
   * Positions must be vec3f. Colours are kept as-is.
   */
  updatePositions(positions: Float32Array): void {
    if (!this.device || !this.positionBuffer) return;

    const neededBytes = this.pointCount * 12;
    if (this.positionBuffer.size < neededBytes) {
      this.positionBuffer.destroy();
      this.positionBuffer = this.device.createBuffer({
        size: neededBytes,
        usage: GPUBufferUsage.VERTEX + GPUBufferUsage.COPY_DST,
      });
    }

    this.device.queue.writeBuffer(
      this.positionBuffer,
      0,
      positions.buffer as ArrayBuffer,
      0,
      this.pointCount * 3 * 4
    );
    this.positionsCache = new Float32Array(positions.buffer.slice(0, this.pointCount * 3 * 4));
    this.computeBounds(positions, this.pointCount);

    if (!this.userInteracted) {
      this.fitToData();
    }
  }

  // ── High-level convenience ────────────────────────────────────

  /**
   * Set embedding data from the formats UMAP produces.
   *
   * Automatically detects 2D vs 3D from the embedding shape and
   * converts to the internal vec3f format (z = 0 for 2D).
   */
  setEmbedding(embedding: number[][] | Float32Array, labels: number[], palette: string[]): void {
    const isArray = Array.isArray(embedding);
    const dim = isArray ? (embedding as number[][])[0]?.length ?? 2 : this.dimensions; // flat array: trust current mode
    const n = isArray ? (embedding as number[][]).length : (embedding as Float32Array).length / dim;

    this.dimensions = dim === 3 ? 3 : 2;

    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 4);

    // Fill positions → always vec3f
    if (isArray) {
      const arr = embedding as number[][];
      for (let i = 0; i < n; i++) {
        positions[i * 3] = arr[i][0];
        positions[i * 3 + 1] = arr[i][1];
        positions[i * 3 + 2] = dim === 3 ? arr[i][2] : 0;
      }
    } else {
      const flat = embedding as Float32Array;
      if (dim === 3) {
        for (let i = 0; i < n; i++) {
          positions[i * 3] = flat[i * 3];
          positions[i * 3 + 1] = flat[i * 3 + 1];
          positions[i * 3 + 2] = flat[i * 3 + 2];
        }
      } else {
        for (let i = 0; i < n; i++) {
          positions[i * 3] = flat[i * 2];
          positions[i * 3 + 1] = flat[i * 2 + 1];
          positions[i * 3 + 2] = 0;
        }
      }
    }

    // Fill colours (alpha = 1.0; global opacity is shader-controlled)
    for (let i = 0; i < n; i++) {
      const [r, g, b] = hexToRGB(palette[labels[i] % palette.length]);
      colors[i * 4] = r;
      colors[i * 4 + 1] = g;
      colors[i * 4 + 2] = b;
      colors[i * 4 + 3] = 1.0;
    }

    this.pointSize = n > 5000 ? 1.5 : n > 1000 ? 2.5 : 4;
    this.labelsCache = Array.from(labels);
    this.setData(positions, colors, n);
  }

  /**
   * Set cluster label names to display at centroids.
   * Pass null or empty array to remove labels.
   */
  setLabelNames(names: string[] | null): void {
    this.labelNames = names && names.length > 0 ? names : null;
    this.rebuildLabelElements();
    this.updateLabelPositions();
  }

  /** Update positions only (keeps colours). Accepts same formats as `setEmbedding`. */
  updateEmbedding(embedding: number[][] | Float32Array): void {
    const isArray = Array.isArray(embedding);
    const dim = this.dimensions;
    const n = isArray ? (embedding as number[][]).length : (embedding as Float32Array).length / dim;

    const positions = new Float32Array(n * 3);

    if (isArray) {
      const arr = embedding as number[][];
      for (let i = 0; i < n; i++) {
        positions[i * 3] = arr[i][0];
        positions[i * 3 + 1] = arr[i][1];
        positions[i * 3 + 2] = dim === 3 ? arr[i][2] : 0;
      }
    } else {
      const flat = embedding as Float32Array;
      if (dim === 3) {
        for (let i = 0; i < n; i++) {
          positions[i * 3] = flat[i * 3];
          positions[i * 3 + 1] = flat[i * 3 + 1];
          positions[i * 3 + 2] = flat[i * 3 + 2];
        }
      } else {
        for (let i = 0; i < n; i++) {
          positions[i * 3] = flat[i * 2];
          positions[i * 3 + 1] = flat[i * 2 + 1];
          positions[i * 3 + 2] = 0;
        }
      }
    }

    this.updatePositions(positions);
  }

  // ── View ──────────────────────────────────────────────────────

  /** Reset the view to fit all data. */
  fitToData(): void {
    if (this.dimensions === 2) {
      this.center2d = [
        (this.dataMin[0] + this.dataMax[0]) / 2,
        (this.dataMin[1] + this.dataMax[1]) / 2,
      ];
      const rangeX = this.dataMax[0] - this.dataMin[0] || 1;
      const rangeY = this.dataMax[1] - this.dataMin[1] || 1;
      const pad = 0.9;
      this.scale2d = Math.min(
        (this.canvas.width * pad) / rangeX,
        (this.canvas.height * pad) / rangeY
      );
      this.fitScale2d = this.scale2d;
      this.zoomTarget2d = this.scale2d;
    } else {
      this.target3d = [
        (this.dataMin[0] + this.dataMax[0]) / 2,
        (this.dataMin[1] + this.dataMax[1]) / 2,
        (this.dataMin[2] + this.dataMax[2]) / 2,
      ];
      const rangeX = this.dataMax[0] - this.dataMin[0] || 1;
      const rangeY = this.dataMax[1] - this.dataMin[1] || 1;
      const rangeZ = this.dataMax[2] - this.dataMin[2] || 1;
      const radius = Math.sqrt(rangeX * rangeX + rangeY * rangeY + rangeZ * rangeZ) / 2;
      // Place camera so the bounding sphere fills ~90% of the vertical FOV
      const fov = Math.PI / 4;
      this.cameraDist = (radius / Math.tan(fov / 2)) * 0.7;
      this.fitCameraDist = this.cameraDist;
      this.zoomTargetDist = this.cameraDist;
      this.rotX = -0.4;
      this.rotY = 0.6;
    }
    this.updateAutoRotate();
  }

  /** Reset view to auto-fit and re-render. */
  resetView(): void {
    this.userInteracted = false;
    this.fitToData();
    this.render();
  }

  // ── MVP construction ──────────────────────────────────────────

  private buildMVP(): Float32Array {
    if (this.dimensions === 2) {
      return this.build2dMVP();
    }
    return this.build3dMVP();
  }

  /** 2D ortho: (pos - center) * scale → NDC with Y flipped. */
  private build2dMVP(): Float32Array {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const sx = (2 * this.scale2d) / w;
    const sy = -(2 * this.scale2d) / h; // flip Y
    const tx = -this.center2d[0] * sx;
    const ty = -this.center2d[1] * sy;

    // Column-major 4×4
    const m = new Float32Array(16);
    m[0] = sx;
    m[5] = sy;
    m[10] = 1;
    m[15] = 1;
    m[12] = tx;
    m[13] = ty;
    return m;
  }

  /** 3D perspective + orbit camera. */
  private build3dMVP(): Float32Array {
    const aspect = this.canvas.width / this.canvas.height;
    const fov = Math.PI / 4;
    const near = this.cameraDist * 0.01;
    const far = this.cameraDist * 100;
    const proj = mat4Perspective(fov, aspect, near, far);

    // Orbit camera: spherical coords around target
    const cosX = Math.cos(this.rotX);
    const sinX = Math.sin(this.rotX);
    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);
    const eye: V3 = [
      this.target3d[0] + this.cameraDist * sinY * cosX,
      this.target3d[1] + this.cameraDist * sinX,
      this.target3d[2] + this.cameraDist * cosY * cosX,
    ];
    const view = mat4LookAt(eye, this.target3d, [0, 1, 0]);
    return mat4Multiply(proj, view);
  }

  // ── Render ────────────────────────────────────────────────────

  /** Draw one frame. */
  render(): void {
    if (!this.device || !this.gpuContext || !this.pipeline || !this.bindGroup) return;

    const bg = this.backgroundColor;

    // Build MVP and write uniforms (112 bytes = 28 floats)
    const mvp = this.buildMVP();
    const is3d = this.dimensions === 3;
    const [depthNear, depthFar] = is3d ? this.computeDepthRange() : [0, 1];

    const uData = new Float32Array(28);
    uData.set(mvp, 0); // [0..15]  mvp
    uData[16] = this.canvas.width; // resolution.x
    uData[17] = this.canvas.height; // resolution.y
    uData[18] = this.pointSize; // pointSize
    uData[19] = is3d ? this.fogStrength : 0; // fogStrength (off for 2D)
    uData[20] = bg[0]; // fogColor.r  (= background)
    uData[21] = bg[1]; // fogColor.g
    uData[22] = bg[2]; // fogColor.b
    uData[23] = depthNear; // depthNear
    uData[24] = depthFar; // depthFar
    uData[25] = this.opacity; // opacity
    // [26..27] padding
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, uData);

    // Ensure depth texture matches canvas dimensions
    this.ensureDepthTexture();

    const encoder = this.device.createCommandEncoder();
    const textureView = this.gpuContext.getCurrentTexture().createView();

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: bg[0], g: bg[1], b: bg[2], a: bg[3] },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this.depthTextureView!,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    if (this.pointCount > 0 && this.positionBuffer && this.colorBuffer && this.quadBuffer) {
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.setVertexBuffer(0, this.quadBuffer);
      pass.setVertexBuffer(1, this.positionBuffer);
      pass.setVertexBuffer(2, this.colorBuffer);
      pass.draw(4, this.pointCount);
    }

    pass.end();
    this.device.queue.submit([encoder.finish()]);

    // Update HTML label overlays
    this.updateLabelPositions();
  }

  // ── Internals ─────────────────────────────────────────────────

  /** Compute the eye-space depth range of the data bounding sphere. */
  private computeDepthRange(): [number, number] {
    const rx = this.dataMax[0] - this.dataMin[0];
    const ry = this.dataMax[1] - this.dataMin[1];
    const rz = this.dataMax[2] - this.dataMin[2];
    const radius = Math.sqrt(rx * rx + ry * ry + rz * rz) / 2;
    return [Math.max(this.cameraDist - radius, 0.01), this.cameraDist + radius];
  }

  private computeBounds(positions: Float32Array, count: number): void {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    this.dataMin = [minX, minY, minZ];
    this.dataMax = [maxX, maxY, maxZ];
  }

  // ── Mouse events ──────────────────────────────────────────────

  /** Smoothly animate zoom toward the target value. */
  /** Start or stop the auto-rotation animation loop. */
  updateAutoRotate(): void {
    if (this.autoRotate && this.dimensions === 3 && !this.isDragging) {
      if (this.autoRotateAnimId === null) {
        this.autoRotateLastTime = performance.now();
        const tick = (now: number) => {
          if (!this.autoRotate || this.dimensions !== 3 || this.destroyed) {
            this.autoRotateAnimId = null;
            return;
          }
          // Pause while user is dragging
          if (!this.isDragging) {
            const dt = (now - this.autoRotateLastTime) / 1000;
            this.rotY += this.autoRotateSpeed * dt;
            this.render();
          }
          this.autoRotateLastTime = now;
          this.autoRotateAnimId = requestAnimationFrame(tick);
        };
        this.autoRotateAnimId = requestAnimationFrame(tick);
      }
    } else {
      if (this.autoRotateAnimId !== null) {
        cancelAnimationFrame(this.autoRotateAnimId);
        this.autoRotateAnimId = null;
      }
    }
  }

  private startZoomAnimation(mx: number, my: number): void {
    if (this.zoomAnimId !== null) return; // already running

    const LERP = 0.15; // ease factor per frame (0..1, lower = smoother)
    const EPSILON = 0.0005; // relative convergence threshold
    const MAX_FRAMES = 120; // hard cap to guarantee termination
    let frame = 0;

    const tick = () => {
      frame++;
      let done = false;

      if (this.dimensions === 2) {
        const prev = this.scale2d;
        const diff = this.zoomTarget2d - this.scale2d;
        if (Math.abs(diff) < Math.abs(this.scale2d) * EPSILON || frame >= MAX_FRAMES) {
          this.scale2d = this.zoomTarget2d;
          done = true;
        } else {
          this.scale2d += diff * LERP;
        }

        // Keep point under cursor fixed
        const dataX = this.center2d[0] + (mx - this.canvas.width / 2) / prev;
        const dataY = this.center2d[1] + (my - this.canvas.height / 2) / prev;
        this.center2d[0] = dataX - (mx - this.canvas.width / 2) / this.scale2d;
        this.center2d[1] = dataY - (my - this.canvas.height / 2) / this.scale2d;
      } else {
        const diff = this.zoomTargetDist - this.cameraDist;
        if (Math.abs(diff) < Math.abs(this.cameraDist) * EPSILON || frame >= MAX_FRAMES) {
          this.cameraDist = this.zoomTargetDist;
          done = true;
        } else {
          this.cameraDist += diff * LERP;
        }
      }

      this.render();

      if (done) {
        this.zoomAnimId = null;
      } else {
        this.zoomAnimId = requestAnimationFrame(tick);
      }
    };

    this.zoomAnimId = requestAnimationFrame(tick);
  }

  // ── Selection ────────────────────────────────────────────────

  /** Create the selection rectangle overlay (a CSS-positioned div). */
  private ensureSelectionOverlay(): HTMLDivElement {
    if (this.selectionOverlay) return this.selectionOverlay;
    const div = document.createElement('div');
    div.style.cssText =
      'position:absolute;border:1.5px dashed rgba(56,189,248,0.8);background:rgba(56,189,248,0.08);' +
      'pointer-events:none;display:none;z-index:10;border-radius:2px;';
    // Position relative to the canvas
    const parent = this.canvas.parentElement!;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(div);
    this.selectionOverlay = div;
    return div;
  }

  /** Update the overlay rectangle from two canvas-relative points. */
  private updateSelectionRect(x0: number, y0: number, x1: number, y1: number): void {
    const overlay = this.ensureSelectionOverlay();
    const left = Math.min(x0, x1);
    const top = Math.min(y0, y1);
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${w}px`;
    overlay.style.height = `${h}px`;
    overlay.style.display = w > 2 || h > 2 ? 'block' : 'none';
  }

  /**
   * Project a 3D data point to canvas pixel coordinates using the current MVP.
   * Returns [px, py] or null if the point is behind the camera.
   */
  private projectToScreen(
    mvp: Float32Array,
    x: number,
    y: number,
    z: number
  ): [number, number, number] | null {
    // Multiply by MVP (column-major)
    const cx = mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12];
    const cy = mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13];
    const cw = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15];
    if (cw <= 0) return null; // behind camera
    const ndcX = cx / cw;
    const ndcY = cy / cw;
    // NDC [-1,1] → pixel
    const px = (ndcX * 0.5 + 0.5) * this.canvas.width;
    const py = (1 - (ndcY * 0.5 + 0.5)) * this.canvas.height; // flip Y
    // cw represents distance from camera (larger = further away)
    return [px, py, cw];
  }

  /** Find all point indices whose screen projection falls within the given CSS-pixel rectangle. */
  private computeSelectedIndices(x0: number, y0: number, x1: number, y1: number): Set<number> {
    const indices = new Set<number>();
    if (!this.positionsCache) return indices;

    const mvp = this.buildMVP();
    // Convert pixel-buffer coords to CSS coords
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / this.canvas.width;
    const scaleY = rect.height / this.canvas.height;
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    const top = Math.min(y0, y1);
    const bottom = Math.max(y0, y1);

    for (let i = 0; i < this.pointCount; i++) {
      const px = this.positionsCache[i * 3];
      const py = this.positionsCache[i * 3 + 1];
      const pz = this.positionsCache[i * 3 + 2];
      const screen = this.projectToScreen(mvp, px, py, pz);
      if (!screen) continue;
      // Convert to CSS coords for comparison
      screen[0] *= scaleX;
      screen[1] *= scaleY;
      if (screen[0] >= left && screen[0] <= right && screen[1] >= top && screen[1] <= bottom) {
        indices.add(i);
      }
    }
    return indices;
  }

  /** Apply selection dimming to the color buffer and re-render. */
  applySelectionColors(): void {
    if (!this.device || !this.colorBuffer || !this.colorsCache) return;

    if (this.selectedIndices.size === 0) {
      // No selection → restore original colors
      this.device.queue.writeBuffer(
        this.colorBuffer,
        0,
        this.colorsCache.buffer as ArrayBuffer,
        0,
        this.pointCount * 4 * 4
      );
    } else {
      const dimmed = new Float32Array(this.colorsCache.length);
      const dim = this.selectionDimFactor;
      for (let i = 0; i < this.pointCount; i++) {
        const off = i * 4;
        if (this.selectedIndices.has(i)) {
          // Selected: full color
          dimmed[off] = this.colorsCache[off];
          dimmed[off + 1] = this.colorsCache[off + 1];
          dimmed[off + 2] = this.colorsCache[off + 2];
          dimmed[off + 3] = this.colorsCache[off + 3];
        } else {
          // Non-selected: keep color, reduce alpha for transparency
          dimmed[off] = this.colorsCache[off];
          dimmed[off + 1] = this.colorsCache[off + 1];
          dimmed[off + 2] = this.colorsCache[off + 2];
          dimmed[off + 3] = this.colorsCache[off + 3] * dim;
        }
      }
      this.device.queue.writeBuffer(
        this.colorBuffer,
        0,
        dimmed.buffer as ArrayBuffer,
        0,
        this.pointCount * 4 * 4
      );
    }
    this.render();
  }

  // ── Cluster labels ──────────────────────────────────────────

  /** Create/recreate the label overlay container and label elements. */
  private rebuildLabelElements(): void {
    // Clean up old elements
    this.labelElements.forEach((el) => el.remove());
    this.labelElements = [];

    if (!this.labelNames || this.labelNames.length === 0) {
      return;
    }

    // Ensure container exists
    if (!this.labelOverlayContainer) {
      const div = document.createElement('div');
      div.style.cssText =
        'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:5;';
      const parent = this.canvas.parentElement!;
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(div);
      this.labelOverlayContainer = div;
    }

    // Create a label for each cluster
    for (let i = 0; i < this.labelNames.length; i++) {
      const el = document.createElement('div');
      el.style.cssText =
        'position:absolute;transform:translate(-50%,-50%);' +
        'font-size:11px;font-weight:600;color:#f1f5f9;' +
        'text-shadow:0 0 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.7);' +
        'white-space:pre;text-align:center;pointer-events:none;opacity:0;transition:opacity 0.2s;';
      el.dataset.cluster = String(i);
      el.textContent = this.labelNames[i];
      this.labelOverlayContainer.appendChild(el);
      this.labelElements.push(el);
    }
  }

  /** Compute cluster centroids and position label elements on screen.
   *  Resolves overlaps by hiding labels of smaller clusters. */
  updateLabelPositions(): void {
    if (
      !this.labelNames ||
      this.labelElements.length === 0 ||
      !this.positionsCache ||
      !this.labelsCache ||
      !this.showLabels
    ) {
      // Hide all
      this.labelElements.forEach((el) => {
        el.style.opacity = '0';
      });
      return;
    }

    const nClusters = this.labelNames.length;

    // Compute centroids and point counts per cluster
    const sumX = new Float64Array(nClusters);
    const sumY = new Float64Array(nClusters);
    const sumZ = new Float64Array(nClusters);
    const counts = new Uint32Array(nClusters);

    for (let i = 0; i < this.pointCount; i++) {
      const c = this.labelsCache[i];
      if (c < 0 || c >= nClusters) continue;
      sumX[c] += this.positionsCache[i * 3];
      sumY[c] += this.positionsCache[i * 3 + 1];
      sumZ[c] += this.positionsCache[i * 3 + 2];
      counts[c]++;
    }

    const mvp = this.buildMVP();
    // Scale from canvas pixel-buffer to CSS display size
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / this.canvas.width;
    const scaleY = rect.height / this.canvas.height;
    const cssW = rect.width;
    const cssH = rect.height;

    // Virtual padding around labels for overlap detection (CSS pixels)
    const PAD_X = 40;
    const PAD_Y = 20;

    // Phase 1: position all labels (hidden) and collect candidate bounding boxes
    interface LabelCandidate {
      c: number;
      x: number;
      y: number;
      hw: number;
      hh: number;
      depth: number;
    }
    const candidates: LabelCandidate[] = [];

    for (let c = 0; c < nClusters; c++) {
      const el = this.labelElements[c];
      if (!el) continue;

      if (counts[c] === 0) {
        el.style.opacity = '0';
        continue;
      }

      const cx = sumX[c] / counts[c];
      const cy = sumY[c] / counts[c];
      const cz = sumZ[c] / counts[c];
      const screen = this.projectToScreen(mvp, cx, cy, cz);

      if (!screen) {
        el.style.opacity = '0';
        continue;
      }

      const cssX = screen[0] * scaleX;
      const cssY = screen[1] * scaleY;
      const depth = screen[2];

      if (cssX < -50 || cssX > cssW + 50 || cssY < -50 || cssY > cssH + 50) {
        el.style.opacity = '0';
        continue;
      }

      // Position the element so we can measure it
      el.style.left = `${cssX}px`;
      el.style.top = `${cssY}px`;
      // Don't reset opacity here — reading offsetWidth forces a reflow which
      // commits any transition, causing labels to get stuck fading to 0.
      // Phase 3 will set the correct final opacity for every candidate.

      // Use offsetWidth/Height (available even at opacity 0)
      const hw = el.offsetWidth / 2 + PAD_X;
      const hh = el.offsetHeight / 2 + PAD_Y;

      candidates.push({ c, x: cssX, y: cssY, hw, hh, depth });
    }

    // Phase 2: sort candidates by depth ascending (closest to camera wins), highlighted label first
    candidates.sort(
      (a, b) =>
        Number(b.c === this.highlightedLabel) - Number(a.c === this.highlightedLabel) ||
        a.depth - b.depth
    );

    // Phase 3: greedy placement — show label only if it doesn't overlap any already-placed label
    const placed: LabelCandidate[] = [];

    for (const cand of candidates) {
      let overlaps = false;
      for (const p of placed) {
        // AABB overlap test
        if (Math.abs(cand.x - p.x) < cand.hw + p.hw && Math.abs(cand.y - p.y) < cand.hh + p.hh) {
          overlaps = true;
          break;
        }
      }

      const el = this.labelElements[cand.c];
      if (overlaps) {
        el.style.opacity = '0';
      } else {
        const isDimmed = this.highlightedLabel !== null && this.highlightedLabel !== cand.c;
        el.style.opacity = isDimmed ? '0.25' : '0.85';
        placed.push(cand);
      }
    }
  }

  /** Clear the current selection. */
  clearSelection(): void {
    this.selectedIndices = new Set();
    this.applySelectionColors();
    this.onSelect?.(this.selectedIndices);
  }

  /** Clear all data and render an empty frame. */
  clear(): void {
    this.pointCount = 0;
    this.positionsCache = null;
    this.colorsCache = null;
    this.labelsCache = null;
    this.selectedIndices = new Set();
    this.setLabelNames(null);
    this.render();
  }

  private setupMouseEvents(): void {
    this.abortController = new AbortController();
    const { signal } = this.abortController;
    const canvas = this.canvas;

    // ── Wheel zoom (with easing & limits) ──
    // Zoom limits: 0.1x to 20x of the auto-fit level
    const ZOOM_MIN_FACTOR = 0.1;
    const ZOOM_MAX_FACTOR = 20;
    // Smaller step = slower, gentler zoom per wheel tick
    const ZOOM_STEP = 0.96;

    // Store last mouse position for cursor-centered 2D zoom
    let lastWheelMx = 0;
    let lastWheelMy = 0;

    canvas.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;

        if (this.dimensions === 2) {
          const rect = canvas.getBoundingClientRect();
          // Convert CSS mouse position to canvas pixel-buffer coordinates
          lastWheelMx = (e.clientX - rect.left) * (canvas.width / rect.width);
          lastWheelMy = (e.clientY - rect.top) * (canvas.height / rect.height);

          // Update the zoom target with limits
          const minScale = this.fitScale2d * ZOOM_MIN_FACTOR;
          const maxScale = this.fitScale2d * ZOOM_MAX_FACTOR;
          this.zoomTarget2d = Math.max(minScale, Math.min(maxScale, this.zoomTarget2d * factor));
        } else {
          // For 3D, larger cameraDist = zoomed out
          const minDist = this.fitCameraDist * (1 / ZOOM_MAX_FACTOR);
          const maxDist = this.fitCameraDist * (1 / ZOOM_MIN_FACTOR);
          this.zoomTargetDist = Math.max(minDist, Math.min(maxDist, this.zoomTargetDist / factor));
        }

        this.userInteracted = true;
        this.startZoomAnimation(lastWheelMx, lastWheelMy);
      },
      { signal, passive: false }
    );

    // ── Block macOS ctrl-click context menu on canvas ──
    canvas.addEventListener(
      'contextmenu',
      (e: Event) => {
        e.preventDefault();
      },
      { signal }
    );

    // ── Mouse down ──
    let mouseDownPos: [number, number] = [0, 0]; // track start for click detection

    canvas.addEventListener(
      'mousedown',
      (e: MouseEvent) => {
        if (e.button !== 0) return;
        // Block macOS ctrl-click from propagating as right-click
        if (e.ctrlKey) e.preventDefault();

        this.isDragging = true;
        this.lastMouse = [e.clientX, e.clientY];
        mouseDownPos = [e.clientX, e.clientY];

        // Shift+drag = box selection
        if (e.shiftKey) {
          this.dragMode = 'select';
          const rect = canvas.getBoundingClientRect();
          this.selectionStart = [e.clientX - rect.left, e.clientY - rect.top];
          canvas.style.cursor = 'crosshair';
          return;
        }

        // In 3D: default = rotate, ctrl/meta = pan.  In 2D: always pan.
        if (this.dimensions === 3 && !e.ctrlKey && !e.metaKey) {
          this.dragMode = 'rotate';
          canvas.style.cursor = 'grabbing';
        } else {
          this.dragMode = 'pan';
          canvas.style.cursor = 'move';
        }
      },
      { signal }
    );

    // ── Mouse move ──
    window.addEventListener(
      'mousemove',
      (e: MouseEvent) => {
        if (!this.isDragging) return;

        // Selection drag: update overlay rectangle
        if (this.dragMode === 'select' && this.selectionStart) {
          const rect = canvas.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          this.updateSelectionRect(this.selectionStart[0], this.selectionStart[1], mx, my);
          return;
        }

        const dx = e.clientX - this.lastMouse[0];
        const dy = e.clientY - this.lastMouse[1];
        this.lastMouse = [e.clientX, e.clientY];

        if (this.dimensions === 2) {
          // 2D pan
          this.center2d[0] -= dx / this.scale2d;
          this.center2d[1] -= dy / this.scale2d;
        } else if (this.dragMode === 'rotate') {
          // 3D orbit (feels like grabbing the scene)
          this.rotY -= dx * 0.005;
          this.rotX += dy * 0.005;
          // Clamp pitch to avoid gimbal lock
          this.rotX = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.rotX));
        } else {
          // 3D pan: move target in camera-local XY plane
          const panSpeed = this.cameraDist * 0.002;
          // Camera right & up vectors
          const cosX = Math.cos(this.rotX);
          const sinX = Math.sin(this.rotX);
          const cosY = Math.cos(this.rotY);
          const sinY = Math.sin(this.rotY);
          // Right = camera X axis (perpendicular to view in XZ plane)
          const rx = cosY;
          const rz = -sinY;
          // Up = camera Y axis (perpendicular to view, accounting for pitch)
          const ux = -sinY * sinX;
          const uy = cosX;
          const uz = -cosY * sinX;
          this.target3d[0] += (-dx * rx + dy * ux) * panSpeed;
          this.target3d[1] += dy * uy * panSpeed;
          this.target3d[2] += (-dx * rz + dy * uz) * panSpeed;
        }

        this.userInteracted = true;
        this.render();
      },
      { signal }
    );

    // ── Mouse up ──
    window.addEventListener(
      'mouseup',
      (e: MouseEvent) => {
        if (this.isDragging) {
          // Finish selection
          if (this.dragMode === 'select' && this.selectionStart) {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const dx = Math.abs(mx - this.selectionStart[0]);
            const dy = Math.abs(my - this.selectionStart[1]);

            if (dx > 3 || dy > 3) {
              // Real drag → compute selection
              this.selectedIndices = this.computeSelectedIndices(
                this.selectionStart[0],
                this.selectionStart[1],
                mx,
                my
              );
              this.applySelectionColors();
              this.onSelect?.(this.selectedIndices);
            } else {
              // Tiny drag = click → clear selection
              this.clearSelection();
            }

            // Hide overlay
            if (this.selectionOverlay) {
              this.selectionOverlay.style.display = 'none';
            }
            this.selectionStart = null;
          } else {
            // Non-select click (no significant movement)
            const dx = Math.abs(e.clientX - mouseDownPos[0]);
            const dy = Math.abs(e.clientY - mouseDownPos[1]);
            if (dx < 3 && dy < 3) {
              // Check if click landed on a visible label
              let clickedLabel = -1;
              for (const el of this.labelElements) {
                if (parseFloat(el.style.opacity) < 0.1) continue;
                const lr = el.getBoundingClientRect();
                if (
                  e.clientX >= lr.left &&
                  e.clientX <= lr.right &&
                  e.clientY >= lr.top &&
                  e.clientY <= lr.bottom
                ) {
                  clickedLabel = Number(el.dataset.cluster);
                  break;
                }
              }
              if (clickedLabel >= 0) {
                this.onLabelClick?.(clickedLabel);
              } else if (this.selectedIndices.size > 0) {
                this.clearSelection();
              }
            }
          }

          this.isDragging = false;
          canvas.style.cursor = '';
        }
      },
      { signal }
    );

    // ── Double-click to reset ──
    canvas.addEventListener(
      'dblclick',
      () => {
        this.resetView();
      },
      { signal }
    );
  }
}
