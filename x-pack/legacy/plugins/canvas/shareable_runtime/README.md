# Canvas Shareable Workpads

![Canvas Shareable Runtime](demo.gif)

## Introduction

The Canvas Shareable Runtime is designed to render Shareable Canvas Workpads outside of Kibana in a different website or application. It uses the intermediate, "transient" state of a workpad, which is a JSON-blob state after element expressions are initially evaluated against their data sources, but before the elements are rendered to the screen. This "transient" state, therefore, has no dependency or access to ES/Kibana data, making it lightweight and portable.

This directory contains the code necessary to build and test this runtime.

## Building

Run `node scripts/shareable_runtime`. The runtime will be built and stored `shareable_runtime/build`.

## Development

### Prerequisite

Before testing or running this PR locally, you **must** run `node scripts/runtime` from `/canvas`. It is only built automatically when Kibana is built.

To start the `webpack-dev-server` and test a workpad, simply run:

`/canvas`: `node scripts/shareable_runtime --dev --run`

A browser window should automatically open. If not, open a browser to [`http://localhost:8080/`](http://localhost:8080).

### Customizing

The `index.html` file contains a call to the `CanvasShareable` runtime. Currently, you can share by object or by url:

```html
<script src="kbn_canvas.js"></script>
...
<div kbn-canvas-shareable="canvas" kbn-canvas-height="400" kbn-canvas-url="workpad.json"></div>
<script type="text/javascript">
  KbnCanvas.share();
</script>
```

There are two several workpads available: `/test/workapds/hello.json`, `/test/workapds/test.json` and `/test/workapds/austin.json`.

### Options

The [`api/shareable.tsx`]('./api/shareable') file contains the base class with available options to configure the Shareable Workpad:

```typescript
  /**
   * The preferred height to scale the Shareable Canvas Workpad.  If only `height` is
   * specified, `width` will be calculated by the workpad ratio.  If both are
   * specified, the ratio will be overriden by an absolute size.
   */
  height?: number;

  /**
   * The preferred width to scale the Shareable Canvas Workpad.  If only `width` is
   * specified, `height` will be calculated by the workpad ratio.  If both are
   * specified, the ratio will be overriden by an absolute size.
   */
  width?: number;

  /**
   * The initial page to display.
   */
  page?: number;

  /**
   * Should the runtime automatically move through the pages of the workpad?
   * @default false
   */
  autoplay?: boolean;

  /**
   * The interval upon which the pages will advance in time format, (e.g. 2s, 1m)
   * @default '5s'
   * */
  interval?: string;

  /**
   * Should the toolbar be hidden?
   * @default false
   */
  toolbar?: boolean;
```

## Testing

You can test this functionality in a number of ways. The easiest would be:

### Download a ZIP from Canvas

- Load a workpad in Canvas.
- Click "Export" -> "Share on a website" -> "download a ZIP file"
- Extract and change to the extracted directory.
- Run `python -m SimpleHTTPServer 9001`
- Open a web browser to `http://localhost:9001`

### Test the Runtime Directly from Webpack

- Load a workpad in Canvas.
- Click "Export" -> "Share on a website" -> "Download Workpad"
- Copy the workpad to `canvas/shareable_runtime/test`.
- Edit `canvas/shareable_runtime/index.html` to include your workpad.
- From `/canvas`, run `node scripts/shareable_runtime --dev --run`
- Open a web browser to `http://localhost:8080`

### Run the Storybook

From `/canvas`: `node scripts/storybook`

### Run the Jest Tests and Gather Coverage

From `/canvas`: `node scripts/jest --path shareable_runtime --coverage`
