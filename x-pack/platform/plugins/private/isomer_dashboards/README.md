# isomerDashboards (demo only)

Exports a saved dashboard as a PDF drawn by Isomer, and as a one-column mobile view. It's in the Dashboard share menu as **Export → PDF (Isomer)**.

- `POST /internal/isomer_dashboards/{id}/pdf` takes `{ timeRange?, layout?: 'grid' | 'stack', width? }` and returns the PDF.
- `GET /internal/isomer_dashboards/{id}/view?from&to&layout&width` returns the HTML view. `layout` defaults to `stack`.

Both routes export the dashboard and its references with the requesting user's saved objects client. They lower it with `@kbn/isomer-lowering`, running its ES|QL and searches as that user, and draw it with the `isomer` plugin's `getDrawing()`. That needs `xpack.isomer.charts.serverDraw: true`.

This is a separate plugin because `dashboard` is an OSS plugin and can't depend on the x-pack `isomer` plugin. Where the export lives for real (D3) is Presentation's call.
