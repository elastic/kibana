
# SCSS Style Guide

## Original style guide

Our style guide is an extension of [Sass Guidelines by Hugo Giraudel](https://sass-guidelin.es/). The rules we especially focus on are:

* [Syntax & formatting](https://sass-guidelin.es/#syntax--formatting) (exceptions below)
* [Naming conventions](https://sass-guidelin.es/#naming-conventions) (see the [CSS Style Guide](css_style_guide.md) for infomation on exceptions)
* [Variables](https://sass-guidelin.es/#variables)
* [Mixins](https://sass-guidelin.es/#mixins)

## Syntax and formatting

The Sass Guidelines site recommends using RBG and HSL values to format colors, but we're using
hex values.

### Bemify for namespacing

We use the [bemify](https://github.com/franzheidl/bemify) for namespacing the sass into a BEM format. We use `component`, `child`, `modifier` and `state` as our mixin names. We've adjusted the plugin's state mixin so that you need to write out the full selector (`@include state('is-happening')`).

## Dealing with extends

Don't extend classes. The only time use should use an extend is when you are extending a placeholder. Even then, do it rarely and only for code maintainability.
