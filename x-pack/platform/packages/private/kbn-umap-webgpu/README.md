# @kbn/umap-webgpu

WebGPU-accelerated UMAP dimensionality reduction, DBSCAN clustering and a WebGPU point renderer for the browser. Falls back to the CPU when WebGPU is unavailable.

Vendored from [elastic/umap-webgpu-sandbox](https://github.com/elastic/umap-webgpu-sandbox) (`ffc3143`). Portions are ported from [umap-js](https://github.com/PAIR-code/umap-js) (Apache-2.0), which is itself a port of [UMAP](https://github.com/lmcinnes/umap) (BSD-3-Clause). The full notices are in the `@notice` block in `src/umap.ts` and in Kibana's `NOTICE.txt`.

The upstream sandbox does not declare a license yet (`"license": "tbd"`), so its author and Elastic legal need to sign off before this ships.

Changes from upstream, needed to pass Kibana's lint rules:

- Files renamed to snake_case and the public exports moved to `index.ts`.
- WebGPU usage flags are combined with `+` instead of `|` (`no-bitwise`). The flags are distinct bits, so the values are identical.
- `OptimizationState` moved to its own file (`max-classes-per-file`).
- Debug `console` logging removed from clustering.
- Sandbox-only data utilities (`data-utils.ts`: synthetic blobs, circles and moons datasets, and `subsample`) removed.
- Tests run on Jest instead of Vitest, with an inline seeded PRNG instead of `prando`.

Additions:

- `WebGPURenderer.setBackgroundColor()` changes the background after construction, so a host can restyle the plot without re-creating the renderer.
- `WebGPURenderer.highlightedLabel` fades every other cluster label and gives the highlighted one priority when labels overlap.

Note that the upstream README's renderer example is out of date. The renderer takes data through `setEmbedding(embedding, labels, palette)`.

```ts
import { UMAP, WebGPURenderer } from '@kbn/umap-webgpu';

const renderer = new WebGPURenderer(canvas, { pointSize: 4 });
if (await renderer.init()) {
  const umap = new UMAP({ nNeighbors: 15, minDist: 0.1, nComponents: 2 });
  const embedding = await umap.fitAsync(vectors);
  renderer.setEmbedding(embedding, labels, palette);
  renderer.render();
}
```
