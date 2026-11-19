# Vector projection

Dashboard panel that projects document embeddings to 2D or 3D with [UMAP](https://umap-learn.readthedocs.io/) and draws the result with WebGPU, using `@kbn/umap-webgpu`.

Add it from **Add panel → Other visualizations → Vector projection** and choose a data view, a vector field and, optionally, a field to color points by. Without a color field, points are colored by automatic DBSCAN clustering of the projection.

The panel samples up to `sample_size` documents (seeded random sample) that match the dashboard's time range, query and filters, and runs UMAP in the browser. Browsers without WebGPU fall back to CPU UMAP and a 2D canvas.

## Vector fields

- `dense_vector` fields are read through the search `fields` option.
- `semantic_text` fields are supported when their inference endpoint produces dense embeddings (`text_embedding` or `embedding` task types). Sparse models such as ELSER are not. Embeddings are read from `_source._inference_fields`, and a document with several chunks is plotted at the mean of its chunk embeddings.

Data views report `semantic_text` fields as `text`, so the editor finds them by sampling 20 documents. A field that is empty in all of them won't be listed.

Elasticsearch returns every `semantic_text` field of a document when `_inference_fields` is requested, roughly 10 KB per field per document for 768-dimension embeddings. Use a smaller sample size on indices with several semantic fields.
