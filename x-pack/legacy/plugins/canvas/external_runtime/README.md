# Canvas External Embeds

![Canvas External Runtime](demo.gif)

## Introduction

The external runtime is designed to render Canvas Workpads outside of Kibana in a different website or application. It uses the intermediate, "transient" state of a workpad, which is a JSON-blob state after element expressions are evaluated, but before the elements are rendered to the screen. This "transient" state, therefore, has no dependency or access to ES/Kibana data, making it lightweight and portable.

This directory contains the code necessary to build and test this external runtime.

## Building

Run `node scripts/external_runtime`. The runtime will be built and stored `external_runtime/build`.

## Development

To start the `webpack-dev-server` and test a workpad, simply run:

`/canvas: node scripts/external_runtime --dev --run`

A browser window should automatically open. If not, navigate to [`http://localhost:9001/`](http://localhost:9001).

### Customizing

The `index.html` file contains a call to the `CanvasEmbed` runtime. Currently, you can embed by object or by url:

```html
<script src="kbn_canvas.js"></script>
...
<div kbn-canvas-embed="canvas" kbn-canvas-height="400" kbn-canvas-url="workpad.json"></div>
<script type="text/javascript">
  KbnCanvas.embed();
</script>
```

There are two test workpads available: `/test/test.json` and `/test/austin.json`.

### Options

The [`api/embed.tsx`]('./api/embed') file contains the base class with available options to configure the embed:

```typescript
height?: number;
width?: number;
page?: number;
```

More options are available, but have not yet been exposed, (e.g. toolbar hide, etc)

## Testing

You can load a Workpad in Canvas, click "Export" and then "Embed on a website". You can then download a ZIP file with the runtime, the workpad and a sample HTML file.

After extracting to a directory, you can then start a small web server to load the HTML file. The easiest way, if you have `python` installed, is to run `python -m SimpleHTTPServer 8000` from the extracted directory.
