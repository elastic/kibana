# Kibana UI Framework

## Development

* Start development server `npm run uiFramework:start`.
* View docs on `http://localhost:8020/`.

## What is this?

The Kibana UI Framework provides you with UI components you can quickly use to build user interfaces for Kibana.

The UI Framework comes with interactive examples which document how to use its various UI components. These components are currently only implemented in CSS, but eventually they'll grow to involve JS as well.

When you build a UI using this framework (e.g. a plugin's UI), you can rest assured it will integrate seamlessly into the overall Kibana UI.

## How to create a new component

There are two steps to creating a new component:

1. Create the CSS for the component in `ui_framework/components`.
2. Document it with examples in `ui_framework/doc_site`.

### Create the component CSS

1. Create a directory for your component in `ui_framework/components`.
2. In this directory, create `_{component name}.scss`.
3. _Optional:_ Create any other components that should be logically-grouped in this directory (see below).
4. Create an `_index.scss` file in this directory that import all of the new component SCSS files you created.
5. Import the `_index.scss` file into `ui_framework/components/index.scss`.

This makes your styles available to Kibana and the UI Framework documentation.

#### Logically-grouped components

If a component has subcomponents (e.g. ToolBar and ToolBarSearch), tightly-coupled components (e.g. Button and ButtonGroup), or you just want to group some related components together (e.g. TextInput, TextArea, and CheckBox), then they belong in the same logicaly grouping. In this case, you can create additional SCSS files for these components in the same component directory.

### Document the component with examples

1. Create a directory for your example in `ui_framework/doc_site/src/views`. Name it the name of the component.
2. Create a `{component name}_example.jsx` file inside the directory. You'll use this file to define the different examples for your component.
3. Add the route to this file in `ui_framework/doc_site/src/services/routes/Routes.js`.
4. In the `.jsx` file you created, define examples which demonstrate the component. An example consists of a title, an optional description, an HTML file and an optional JavaScript file. It might help to refer to other examples to see how they're structured.

The complexity of the component should determine how many examples you need to create, and how complex they should be. In general, your examples should demonstrate:

* The most common use-cases for the component.
* How the component handles edge cases, e.g. overflowing content, text-based vs. element-based content.
* The various states of the component, e.g. disabled, selected, empty of content, error state.

## Writing CSS

Check out our [CSS style guide](https://github.com/elastic/kibana/blob/master/style_guides/css_style_guide.md).

## Benefits

### Dynamic, interactive documentation

By having a "living style guide", we relieve our designers of the burden of creating and maintaining static style guides. This also makes it easier for our engineers to translate mockups, prototypes, and wireframes into products.

### Copy-pasteable UI

Engineers can copy and paste sample code into their projects to quickly get reliable, consistent results.

### Remove CSS from the day-to-day

The CSS portion of this framework means engineers don't need to spend mental cycles translating a design into CSS. These cycles can be spent on the things critical to the identity of the specific project they're working on, like architecture and business logic.

Once this framework also provides JS components, engineers won't even need to _see_ CSS -- it will be encapsulated behind the JS components' interfaces.

### More UI tests === fewer UI bugs

By covering our UI components with great unit tests and having those tests live within the framework itself, we can rest assured that our UI layer is tested and remove some of that burden from out integration/end-to-end tests.

## Why not just use Bootstrap?

In short: we've outgrown it! Third-party CSS frameworks like Bootstrap and Foundation are designed
for a general audience, so they offer things we don't need and _don't_ offer things we _do_ need.
As a result, we've been forced to override their styles until the original framework is no longer
recognizable. When the CSS reaches that point, it's time to take ownership over it and build
your own framework.

We also gain the ability to fix some of the common issues with third-party CSS frameworks:

* They have non-semantic markup.
* They deeply nest their selectors.

For a more in-depth analysis of the problems with Bootstrap (and similar frameworks), check out this article and the links it has at the bottom: ["Bootstrap Bankruptcy"](http://www.matthewcopeland.me/blog/2013/11/04/bootstrap-bankruptcy/).

## Examples of other in-house UI frameworks

* [GitHub's Primer](http://primercss.io/)
* [Palantir's Blueprint](http://blueprintjs.com/docs/#components)
* [Ubiquiti CSS Framework](http://ubnt-css.herokuapp.com/#/app/popover)
* [Smaato React UI Framework](http://smaato.github.io/ui-framework/#/modal)
* [Lonely Planet Style Guide](http://rizzo.lonelyplanet.com/styleguide/design-elements/colours)
* [MailChimp Patterns Library](http://ux.mailchimp.com/patterns)
* [Salesforce Lightning Design System](https://www.lightningdesignsystem.com/)
* [Refills](http://refills.bourbon.io/)
* [Formstone](https://formstone.it/)