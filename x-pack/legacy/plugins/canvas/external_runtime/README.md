# Canvas External Embeds

![Canvas External Runtime](demo.gif)

## Introduction

The external runtime is designed to render Canvas Workpads outside of Kibana in a different website or application. It uses the intermediate, "transient" state of a workpad, which is a JSON-blob state after element expressions are evaluated, but before the elements are rendered to the screen. This "transient" state, therefore, has no dependency or access to ES/Kibana data, making it lightweight and portable.

This directory contains the code necessary to build and test this external runtime.

## Building

Run `node scripts/external_runtime`. The runtime will be built and stored in the Kibana `built_assets` directory.

## Development

To start the `webpack-dev-server` and test a workpad, simply run:

`/canvas: node scripts/external_runtime --dev --run`

A browser window should automatically open. If not, navigate to [`http://localhost:9001/`](http://localhost:9001).

### Customizing

The `index.html` file contains a call to the `CanvasEmbed` runtime. Currently, you can embed by object or by url:

```html
<script src=""></script>
...
<div id="canvas"></div>
<script>
  new ElasticCanvas.EmbedFromURL(document.getElementById('canvas'), '/test/austin.json');
</script>
```

There are two test workpads available: `/test/test.json` and `/test/austin.json`.

### Options

The [`api/base_embed.ts`]('./api/base_embed') file contains the base class with options you can pass to configure the embed:

```typescript
height?: number;
width?: number;
page?: number;
```

More options are available, but have not yet been exposed, (e.g. toolbar hide, etc)

## Exporting a Canvas

This branch contains an endpoint you can use to generate and download a workpad in its transient state. This will eventually become part of the Canvas UI.

To download a workpad, start this branch locally and visit the following URL:

```
[host+kibana]/app/canvas#/export/workpad/external_embed/[workpad-id]
```

This will present a button that will allow you to download the `json` file to your local machine. Drop that file into `canvas/external_runtime/test` directory, and then change the `ElasticCanvas.EmbedFromURL` to call to reflect that JSON file.
