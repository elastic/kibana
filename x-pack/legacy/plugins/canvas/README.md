# Canvas

"Never look back. The past is done. The future is a blank canvas." ― Suzy Kassem, Rise Up and Salute the Sun

## Getting Started

Canvas is included with X-Pack and requires a Basic license or better to use.

### Developing in Canvas

To develop your own Canvas plugins, you simply create a Kibana plugin, and register your customizations with Canvas.

The following is a step-by-step guide to adding your own custom random number Canvas plugin.

#### Generating a Kibana plugin

```bash
# in the kibana directory
# Rename canvas_example to whatever you want your plugin to be named
node scripts/generate_plugin.js canvas_example
```

This will prompt you for some input. Generally, you can answer as follows:

```
❯ node scripts/generate_plugin.js canvas_example
? Provide a short description An awesome Kibana plugin
? What Kibana version are you targeting? master
? Should an app component be generated? No
? Should translation files be generated? No
? Should a hack component be generated? No
? Should a server API be generated? No
```

Once this has completed, go to your plugin directory:

```bash
cd plugins/canvas_example
```

Open that folder in your code editor of choice: `code .`

#### Creating a Canvas element and function

Open your plugin's `index.js` file, and modify it to look something like this (but replace canvas_example with whatever you named your plugin):

```js
export default function (kibana) {
  return new kibana.Plugin({
    // Tell Kibana that this plugin needs canvas and the Kibana interpreter
    require: ['interpreter', 'canvas'],

    // The name of your plugin. Make this whatever you want.
    name: 'canvas_example',

    uiExports: {
      // Tell Kibana that the files in `/public` should be loaded into the
      // browser only when the user is in the Canvas app.
      canvas: ['plugins/canvas_example']
    },

    // Enable the plugin by default
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
  });
}
```

Now that the Kibana plugin boilerplate is out of the way, you can write a Canvas plugin.

Create a new file: `public/index.js` and make it look like this:

```js
/*global kbnInterpreter */

// Elements show up in the Canvas elements menu and can be visually added to a canvas
const elements = [
  () => ({
    name: 'randomNumber',
    displayName: 'Random Number',
    help: 'A random number between 1 and 100',
    image: 'https://images.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltb59c89a07c05b937/5c583a6602ac90e80ba0ab8f/icon-white-circle-elastic-stack.svg',
    expression: 'random | metric "Random Number"',
  }),
];

// Browser functions are Canvas functions which run in the browser, and can be used in
// expressions (such as `random | metric "Random Number"`)
const browserFunctions = [
  () => ({
    name: 'random',
    help: 'Make a random number between 1 and 100',
    args: {},
    fn() {
      return Math.floor(Math.random() * 100) + 1;
    }
  }),
];

// Register our elements and browserFunctions with the Canvas interpreter.
kbnInterpreter.register({
  elements,
  browserFunctions,
});

```

#### Trying out your new plugin

In the terminal, in your plugin's directory, run:

```bash
# In plugins/canvas_example
yarn start
```

- Pull up Kibana in your browser: `http://localhost:5601`
- Go to canvas, and click: "Create workpad"
- Click: "Add element"
- Click: "Random Number"

#### Adding a server-side function

Now, let's add a function which runs on the server.

In your plugin's root `index.js` file, modify the `kibana.Plugin` definition to have an init function:

```js
export default function (kibana) {
  return new kibana.Plugin({
    // Tell Kibana that this plugin needs canvas and the Kibana interpreter
    require: ['interpreter', 'canvas'],

    // The name of your plugin. Make this whatever you want.
    name: 'canvas_example',

    uiExports: {
      // Tell Kibana that the files in `/public` should be loaded into the
      // browser only when the user is in the Canvas app.
      canvas: ['plugins/canvas_example']
    },

    // Enable the plugin by default
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    // Add this init function, which registers a new function with Canvas: `serverTime`
    init(server) {
      const { register } = server.plugins.interpreter;
      register({
        serverFunctions: [
          () => ({
            name: 'serverTime',
            help: 'Get the server time in milliseconds',
            args: {},
            fn() {
              return Date.now();
            },
          })
        ],
      });
    },
  });
}
```

Now, let's try out our new server function.

- Refresh your browser.
- In the same Canvas workpad:
  - Add another Random Number element as before
  - Click that element to select it
  - Click "Expression editor"
  - Modify the expression to look like this: `serverTime | metric "Server Time in ms"`
  - Click "Run"

You should now see one random number and one "Server Time in ms" value.

## Scripts

There are several scripts available once you are in that path as well.

- `node scripts/lint` - local linter setup, can also be used with the `--fix` flag for automatic fixes.
- `node scripts/test` - local test runner, does not require a real Kibana instance. Runs all the same unit tests the normal runner does, just limited to Canvas, and *waaaaaay* faster (currently 12 seconds or less).
- `node scripts/test_dev` - Same as above, but watches for changes and only runs tests for the given scope (browser, server, or common).

## Feature Questions

**Why are there no tooltips**

We've opted for always available data labels instead, for now. While there exists much functionality that can be used for analytical purposes in Canvas our core concern in presentational. In a hands-off presentation format, such as a report or a slideshow, there is no facility for user to mouseover a chart to see a tooltip; data labels are a better fit for us.

## Background

**What is Canvas?**

Canvas is a new visualization application on top of Elasticsearch data. Canvas is extremely versatile, but particularly differentiating example use cases include live infographics, presentations with live-updating charts, and highly customized reports.

**Why did we build it? How does this align with the larger Kibana vision?**

We realized early on that we are not trying to build one UI “to rule them all” in Kibana. Elasticsearch caters to a wide variety of use cases, users, and audiences and Kibana provides different experiences for these users to explore and interact with their data. Canvas is one of such applications, in particular catering to users looking for desktop-publishing level of control for the presentation of their data summaries.

**Does Canvas replace any part of Kibana?**

No, it is an alternative experience that does not conflict with other parts of Kibana.

**Isn’t there overlap between Canvas and Dashboard?**

While both can be used as a way to build up reports, Canvas and Dashboard have different goals. Canvas focuses on highly customizable layout more suited to highly curated presentations, while Dashboard provides a fast and efficient way to build up and manage business analytics and operational dashboards that don’t require a high degree of layout control and customizability.

**Where can I see a demo of Canvas?**

Elasticon 2017 keynote (starts at 01:27:00): https://www.elastic.co/elasticon/conf/2017/sf/opening-keynote

Shane Connelly's SQL webinar: https://www.elastic.co/webinars/introduction-to-elasticsearch-sql

**How can I get an early build?**

Check the technical previews out, see http://canvas.elastic.co/stories/installing.html

**Where can I get screenshots?**

If you want a stream of conciousness of the absolute latest development, check out the technical preview microsite at http://canvas.elastic.co/
