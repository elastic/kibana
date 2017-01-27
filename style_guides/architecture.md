# Architecture Style Guide

## File and Folder Structure

Kibana applications, both the core project and any plugins created for Kibana, should follow this basic file and folder structure:

```
plugin_root:

.
├── public/
├── server/
├── common/
└── index.js
```

The **public** folder is where you place client-side code for your application. This folder will automatically be mounted at a prefix starting with `plugins` and your application's `id`. For example, if your application's `id` is *utile*, and you were trying to import a module from `public/lib/formatter.js`, you would import modules as `plugins/utile/lib/formatter`.

The **server** folder is where server code belongs. Things like custom routes, data models, things that communicate with Elasticsearch, or any other code that should only be executed on the server should go here.

The **common** folder is where code that is useful on both the client and the server belongs. A consistent example of this is constants, but this could apply to helper modules as well. *NOTE: If you'd like to avoid adding `../common` to your public code, you can use `webpackShims` to resolve the path without traversing backwards*.

The **index.js** file is the entry point to your application, and is loaded when your code is being used in Kibana. This module should simply export a function that takes the `kibana` server object and initializes your application. This is where you define things like the `id`, any `uiExports`, dependencies on other plugins and applications, any configuration, any initialization code, and the location of the `public` folder.