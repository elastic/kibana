# Architecture Style Guide

## Plugin Architecture

These are a collection of architectural styles to follow when building Kibana plugins. This includes applications meant to be accessed from the Kibana sidebar, as applications are simply one type of plugin.

### File and Folder Structure

Kibana plugins, both in core and those developed independent of Kibana, should follow this basic file and folder structure:

```
plugin_root:

.
├── common/
├── public/
├── server/
└── index.js
```

<dl>
  <dt>index.js</dt>
  <dd>The entry point to your application, this file is loaded when your code is being used in Kibana. This module should simply export a function that takes the <code>kibana</code> server object and initializes your application. This is where you define things like the <em>id</em>, any <em>uiExports</em>, dependencies on other plugins and applications, any configuration, any initialization code, and the location of the <em>public</em> folder.</dd>

  <dt>public</dt>
  <dd>This folder is where you place client-side code for your application. Anything that is run in the browser belongs in here.</dd>
  <dd><strong>NOTE</strong>: An alias for this folder is created at <code>plugins/{id}</code>, where <code>id</code> is what you defined in the plugin entry point. If your application's <code>id</code> is <code>utile</code>, and you were trying to import a module from <code>public/lib/formatter.js</code>, you could import the module as <code>plugins/utile/lib/formatter</code>.
  </dd>

  <dt>server</dt>
  <dd>This folder is where server code belongs. Things like custom routes, data models, or any other code that should only be executed on the server should go here.</dd>

  <dt>common</dt>
  <dd>This folder is where code that is useful on both the client and the server belongs. A consistent example of this is constants, but this could apply to helper modules as well.</dd>
  <dd><strong>NOTE</strong>: If you'd like to avoid adding <code>../common</code> to your public code, you could use <em>webpackShims</em> to resolve the path without traversing backwards.</dd>
</dl>

## Subdirectories

As code gets more complex, it becomes important to organize it into subdirectories. Each subdirectory should contain an `index.js` file that exposes the contents of that directory.

```
plugin_root:

.
├── common/
├── public/
├───── component_one/
├──────── component_one.js
├──────── component_one.html
├──────── component_one_helper.js
├──────── index.js
├───── index.js
├── server/
└── index.js
```

```
public/component_one/index.js:

import './component_one';
```

```
public/index.js (consumer of component_one):

import './component_one';
```

NOTE: There is currently a Webpack plugin that allows import statements to resolve in multiple ways. The statement `import './component_one'` in the `public/index.js` file above would successfully resolve to both `/public/component_one/component_one.js` and `/public/component_one/index.js`. If there is both a named file and an `index.js` file, Webpack will resolve to the `index.js` file. This functionality will be removed in the future, and when that happens, Webpack will only resolve to the `index.js` file.