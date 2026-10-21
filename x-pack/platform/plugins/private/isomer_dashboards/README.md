# isomerDashboards (demo only)

Exports a saved dashboard as a PDF drawn by Isomer, and as a one-column mobile view. It's in the Dashboard share menu as **Export → PDF (Isomer)**.

- `POST /internal/isomer_dashboards/{id}/pdf` takes `{ timeRange?, layout?: 'grid' | 'stack', width?, controls? }` and returns the PDF.
- `POST /internal/isomer_dashboards/{id}/composition` takes the same body and returns `{ composition, hints }` as a download: the composition the PDF draws, which Agent Builder's `render_composition` tool accepts, and the Lens presentation hints by node id. The flyout's **Download composition** saves it.
- `GET /isomer_dashboards/{id}/view?from&to&layout&width&controls` returns the HTML view. `layout` defaults to `stack`. A browser opens it in a tab, so it's an HTTP resource (`http.resources`), not an internal route, which `server.restrictInternalApis` would refuse without `x-elastic-internal-origin`.

Both routes export the dashboard and its references with the requesting user's saved objects client. They lower it with `@kbn/isomer-lowering`, running its ES|QL and searches as that user, and draw it with the `isomer` plugin's `getDrawing()`. That needs `xpack.isomer.charts.serverDraw: true`.

This is a separate plugin because `dashboard` is an OSS plugin and can't depend on the x-pack `isomer` plugin. Where the export lives for real (D3) is Presentation's call.
