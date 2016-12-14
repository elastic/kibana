# Kibana UI Framework

## Development

* Start development server `npm run uiFramework:start`.
* View docs on `http://localhost:8080/`.

## What is this?

The UI Framework provides you with UI components you can quickly use to build UIs, as well as interactive examples which document how they're supposed to be used. These UI components are currently only implemented in CSS and markup, but eventually they'll grow to involve JS as well.

When you build a UI using this framework (e.g. a plugin's UI), you can rest assured it will fit into the overall Kibana UI.

## Benefits

### Dynamic, interactive documentation

By having a "living style guide", we relieve our designers of the burden of creating and maintaining static style guides. This also makes it easier for our engineers to translate mockups, prototypes, and wireframes into products.

### Copy-pasteable UI

Engineers can copy and paste sample code into their projects to quickly get reliable, consistent results.

### Remove CSS from the day-to-day

The CSS portion of this framework means engineers don't need to spend mental cycles. These cycles can be spent on the things critical to the identity of the specific project they're working on, like architecture and business logic.

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

* [Ubiquiti CSS Framework](http://ubnt-css.herokuapp.com/#/app/popover)
* [Smaato React UI Framework](http://smaato.github.io/ui-framework/#/modal)
* [Lonely Planet Style Guide](http://rizzo.lonelyplanet.com/styleguide/design-elements/colours)
* [MailChimp Patterns Library](http://ux.mailchimp.com/patterns)
* [Salesforce Lightning Design System](https://www.lightningdesignsystem.com/)
* [Refills](http://refills.bourbon.io/)
* [Formstone](https://formstone.it/)