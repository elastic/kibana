
# SCSS Style Guide

## Original style guide

Our style guide is an extension of [Sass Guidelines by Hugo Giraudel](https://sass-guidelin.es/). The rules we especially focus on are:

* [Syntax & formatting](https://sass-guidelin.es/#syntax--formatting) (exceptions below)
* [Naming conventions](https://sass-guidelin.es/#naming-conventions) (see the [CSS Style Guide](css_style_guide.md) for infomation on exceptions)
* [Variables](https://sass-guidelin.es/#variables)
* [Mixins](https://sass-guidelin.es/#mixins)


## Responsive layouts

Kibana aims to provide at least a read-only (meaning, editing and controls can be hidden) on layouts when on a small device. We place any responsive Sass at the bottom of our SCSS documents, rather than intermingled within the components themselves.


Good
```sass
@include component('kuiHeader') {
  display: block;
}

@include screenSmall {
  @include component('kuiHeader') {
    display: none;
  }
}
```

Bad
```sass
@include component('kuiHeader') {
  display: block;

  @include screenSmall {
    display: none;
  }
}
```

## Syntax and formatting

The Sass Guidelines site recommends using RBG and HSL values to format colors, but we're using
hex values.

### Bemify for namespacing components

We use a mixin system for namespacing the sass into a BEM-like format. We use `component`, `child`, `modifier`, `state` and `utiligy` as our mixin names.

Component example with lots of nesting.

```sass
// Generates .kuiButton
@include component('kuiButton') {
  color: white;
  background: gray;
  padding: 20px;

  // Generates .kuiButton__icon
  @include child('icon') {
    display: inline-block;
    margin-right: 4px;
    color: white;

    // Generates .kuiButton__icon--danger
    @include modifier('danger') {
      color: red;
    }
  }

  // Generates .kuiButton--primary
  @include modifier('primary') {
    background: blue;
  }

  // Generates .kuiButton.isLoading
  @include state('isLoading') {
    opacity: .5;
    cursor: not-allowed;

    // Generates .kuiButton.isLoading .kuiButton__icon
    @include child('icon') {
      color: gray;
    }
  }
}
```

KUI includes utility classes in `global_styles/utility` which are used to cut down on the amount of duplicate CSS we write and make designing in code faster. Utilities include the `kui--` prefix, since we consider them modifiers to KUI as a whole.

```sass
// Generates .kui--textAlignRight
@include utility('textAlignRight') {
  text-align: right !important;
}
```

The combination of this namespacing means that we can visually see the different between components and utilities.

```
<div class="kuiButton kuiButton--primary kui--textAlignRight">
```

There is also a mixin for creating these utilities in the Sass.

## Dealing with extends

Don't extend classes. The only time use should use an extend is when you are extending a placeholder. Even then, do it rarely and only for code maintainability.

## Variable naming and coloring

KUI is fully themeable. We do this with strict variable naming. Please use the following rules.

* Global vars that can be used across all of KUI should be placed in the `global_styles/variables` directory.
* Component vars that are local to the component should be places in the `component/component_name/_index.scss` file at the top of the document.
* Component vars that deal with coloring should *always* be mathematically calculated from the global coloring variables. This allows us to cascade theming down into the components.
* Make use of the `tintOrShade()` sass function for any coloring that needs variance based upon the lightness of the design.
* In general, there should be few global variables, but we should strive to have many local variables that inherit them.

### Example ###

Good

```sass
// A global color variable that lives at /src/global_styling/variables/_colors.scss

$kuiPrimaryColor: #0079a5; // Blue

// A local color variable that lives at /src/components/some_component/_index.scss
// tintOrShade() will alter the color one way or the other based upon the brightness of the theme.
// This makes our colors work out of the box for dark and light themes.

$kuiSomeComponentItemBackground: tintOrShade($kuiColorPrimary, 90%, 50%);

// A local style that lives in /src/components/some_component/_some_component_item.scss

$kuiSomeComponent__item {
  background: $kuiSomeComponentItemBackground;
}
```

Bad
```sass
// A global color variable that lives at /src/global_styling/variables/_colors.scss

$kuiPrimaryColor: #0079a5; // Blue

// A local variable that doesn't scope against our global theming.

$kuiSomeComponentItemBackground: #990000;
```
