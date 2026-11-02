# Notebooks

Proof of concept for reactive ES|QL notebooks. ES|QL cells fetch once and feed Lens chart cells; inputs bind named query params, and a dependency graph re-runs only the cells affected by a change. Disabled by default; enable with `xpack.notebook.enabled: true`.

The `notebook` saved object type is registered as work in progress, so a Kibana that enables the plugin also needs:

```yaml
migrations.allowWipTypes:
  - notebook
```

Open **Notebooks** and choose **Load demo** to recreate the [Logs] Web Traffic dashboard as a notebook (requires the sample web logs).
