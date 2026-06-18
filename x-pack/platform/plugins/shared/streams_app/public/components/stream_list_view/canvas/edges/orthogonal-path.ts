/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const HOP_RADIUS = 5;

// Emit a horizontal run from (x0,y) to (x1,y), inserting a small upward "bridge"
// arc at each hop x that falls on this row (where another link crosses). The
// arc bulges away from the line so crossings read as not-connected.
function horizontalRun(x0: number, x1: number, y: number, hops: Array<{ x: number; y: number }>) {
  const dir = x1 >= x0 ? 1 : -1;
  // Match hops to this run by row. Tolerance absorbs the sub-pixel difference
  // between the centrally-computed segment Y and React Flow's rendered handle Y;
  // rows are far enough apart that this never matches the wrong run.
  const xs = hops
    .filter((h) => Math.abs(h.y - y) < 8)
    .map((h) => h.x)
    .filter((hx) => (hx - x0) * dir > HOP_RADIUS && (x1 - hx) * dir > HOP_RADIUS)
    .sort((a, b) => dir * (a - b));
  let d = '';
  for (const hx of xs) {
    d += ` L ${hx - dir * HOP_RADIUS},${y}`;
    // Always bulge upward (negative y). Sweep flag flips with travel direction
    // so the arc stays on top whether the run goes left or right.
    d += ` A ${HOP_RADIUS} ${HOP_RADIUS} 0 0 ${dir > 0 ? 0 : 1} ${hx + dir * HOP_RADIUS},${y}`;
  }
  d += ` L ${x1},${y}`;
  return d;
}

// Builds an orthogonal (right-angle) connector path with lightly rounded
// corners whose vertical segment sits at `midX`. This is the manual equivalent
// of getSmoothStepPath but with a *controllable* elbow X, so the user can drag
// the vertical part of a link sideways (see the grip in PipelineRoutingEdge).
// `hops` are crossing points (on this edge's horizontal runs) where a small
// bridge arc is drawn.
export function buildOrthogonalPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  midX: number,
  radius = 20,
  hops: Array<{ x: number; y: number }> = []
): string {
  // No vertical run → a single straight horizontal line (with any bridges).
  if (Math.abs(sy - ty) < 0.5) {
    return `M ${sx},${sy}` + horizontalRun(sx, tx, sy, hops);
  }
  const dirIn = midX >= sx ? 1 : -1; // source → elbow horizontal direction
  const dirOut = tx >= midX ? 1 : -1; // elbow → target horizontal direction
  const down = ty > sy ? 1 : -1; // vertical direction
  const r = Math.max(
    0,
    Math.min(radius, Math.abs(midX - sx), Math.abs(tx - midX), Math.abs(ty - sy) / 2)
  );
  return (
    `M ${sx},${sy}` +
    horizontalRun(sx, midX - dirIn * r, sy, hops) +
    ` Q ${midX},${sy} ${midX},${sy + down * r}` +
    ` L ${midX},${ty - down * r}` +
    ` Q ${midX},${ty} ${midX + dirOut * r},${ty}` +
    horizontalRun(midX + dirOut * r, tx, ty, hops)
  );
}
