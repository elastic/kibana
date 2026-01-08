/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GpuChartShape as GpuChartShapeType } from './constants';

// Re-export for external use
export type GpuChartShape = GpuChartShapeType;

/**
 * LOD (Level of Detail) tier for rendering strategy
 */
export type LodTier = 1 | 2 | 3 | 4;

/**
 * Persisted state for GPU charts visualization
 */
export interface GpuChartsVisualizationState {
  layerId: string;
  layerType: 'data';
  shape: GpuChartShapeType;

  // Dimension accessors
  xAccessor?: string;
  yAccessor?: string;
  zAccessor?: string; // Only for 3D scatter
  colorAccessor?: string;
  sizeAccessor?: string;
  groupAccessor?: string; // For hexagon grouping

  // Visual configuration
  palette?: PaletteConfig;
  pointSize?: number;
  pointOpacity?: number;
  hexagonRadius?: number;
  hexagonElevationScale?: number;

  // 3D camera settings (scatter3d only)
  cameraPosition?: CameraPosition;

  // LOD settings
  lodTier?: LodTier;
  samplingRate?: number;
  userOverrideLod?: boolean; // User manually selected LOD
}

export interface PaletteConfig {
  name: string;
  type: 'palette';
  params?: {
    colors?: string[];
    stops?: number[];
    reverse?: boolean;
  };
}

export interface CameraPosition {
  latitude: number; // Pitch angle in degrees
  longitude: number; // Bearing angle in degrees
  zoom: number;
}

/**
 * Expression function arguments for GPU charts
 */
export interface GpuChartsExpressionArgs {
  shape: GpuChartShape;
  xAccessor: string;
  yAccessor: string;
  zAccessor?: string;
  colorAccessor?: string;
  sizeAccessor?: string;
  groupAccessor?: string;

  // Visual settings
  pointSize: number;
  pointOpacity: number;
  hexagonRadius: number;
  hexagonElevationScale: number;

  // Camera (serialized JSON)
  cameraPosition?: string;

  // Palette (serialized JSON)
  palette?: string;

  // LOD info
  lodTier: LodTier;
  samplingRate: number;
  totalDataPoints: number;
}

/**
 * Columnar data format for GPU rendering
 * Uses TypedArrays for efficient GPU buffer transfer
 */
export interface GpuColumnarData {
  x: Float32Array;
  y: Float32Array;
  z?: Float32Array;
  color?: Float32Array; // Normalized 0-1 values for color mapping
  size?: Float32Array;
  group?: Uint32Array; // Group indices

  // Metadata
  length: number;
  bounds: DataBounds;
}

export interface DataBounds {
  x: { min: number; max: number };
  y: { min: number; max: number };
  z?: { min: number; max: number };
  color?: { min: number; max: number };
  size?: { min: number; max: number };
}

/**
 * WebGL/WebGPU capability detection result
 */
export interface GpuCapabilities {
  webgl2Available: boolean;
  webgpuAvailable: boolean;
  hasPerformanceCaveat: boolean;
  maxTextureSize: number;
  maxVertexAttributes: number;
  renderer: string;
}

/**
 * LOD tier selection result
 */
export interface LodSelection {
  tier: LodTier;
  samplingRate: number;
  estimatedRenderPoints: number;
  reason: string;
}

/**
 * Render props passed to the GPU chart component
 */
export interface GpuChartRenderProps {
  data: GpuColumnarData;
  args: GpuChartsExpressionArgs;
  width: number;
  height: number;
  capabilities: GpuCapabilities;
  onBrushEnd?: (bounds: Partial<DataBounds>) => void;
  onElementClick?: (index: number, data: Record<string, unknown>) => void;
}
