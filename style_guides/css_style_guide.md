
# CSS Style Guide

## Original style guide

Our style guide is an extension of [CSS Guidelines by Harry Roberts](https://cssguidelin.es/). The rules we especially focus on are:

* [Multiple files](https://cssguidelin.es/#multiple-files)
* [Indenting](https://cssguidelin.es/#indenting)
* [Commenting](https://cssguidelin.es/#commenting)
* [Naming conventions](https://cssguidelin.es/#naming-conventions) (see "Naming convention", below, for exceptions)
* [CSS selectors](https://cssguidelin.es/#css-selectors)
* [Specificity](https://cssguidelin.es/#specificity)
* [Architectural principles](https://cssguidelin.es/#architectural-principles)

Please see the [SCSS Style Guide](scss_style_guide.md) for additional rules pertaining to SCSS.

## Contents

- [CSS Style Guide](#css-style-guide)
  - [Selecting elements](#selecting-elements)
  - [Using the preprocessor](#using-the-preprocessor)
    - [Don't build concatenated selector names](#dont-build-concatenated-selector-names)
    - [Avoid nested selectors](#avoid-nested-selectors)
  - [Rules](#rules)
    - [Use uniquely-named "base classes" to represent components](#use-uniquely-named-base-classes-to-represent-components)
    - [Create "descendant classes" to represent child components which can't stand on their own](#create-descendant-classes-to-represent-child-components-which-cant-stand-on-their-own)
    - [Think of deeply-nested child components as "subcomponents" instead of descendants](#think-of-deeply-nested-child-components-as-subcomponents-instead-of-descendants)
    - [Represent states with "state classes"](#represent-states-with-state-classes)
    - [Variations on a component are represented with "modifier classes"](#variations-on-a-component-are-represented-with-modifier-classes)
    - [Don't use multiple modifier classes together](#dont-use-multiple-modifier-classes-together)
    - [How to apply DRY](#how-to-apply-dry)
      - [Compelling reasons for using mixins](#compelling-reasons-for-using-mixins)
    - [The Open/Closed Principle](#the-openclosed-principle)

## Selecting elements

References to CSS selectors within JavaScript are difficult to discover, making it easy to accidentally
break the UI when refactoring markup or CSS.

Instead, add a `data` attribute with a unique and descriptive name and select the element using that.

```html
<div data-welcome-message>Hello, world</div>
```

```javascript
const welcomeMessage = document.querySelector('[data-welcome-message]');
```

This uncouples our CSS from our JavaScript, making it easy to change each independently of the other.

## Using the preprocessor

### Don't build concatenated selector names

This kind of code makes the selector name really difficult to grep for:

```less
.chart {
  // styles

  &Content {
    // styles

    &Title {
      // styles
    }
  }
}

```

This is better:

```less
.chart {
  // styles
}

.chartContent {
  // styles
}

.chartContentTitle {
  // styles
}
```

### Avoid nested selectors

Writing selectors like this makes the markup less readable and the styling less explicit. It also
results in unnecessarily higher selector specificity:

```less
.specialMenu {
  // styles

  > li {
    // styles
  }
}
```

This is better:

```less
.specialMenu {
  // styles
}

.specialMenu__item {
  // styles
}
```

## Naming convention

Our CSS naming convention is based on BEM:

* [BEM 101 (CSS Tricks)](https://css-tricks.com/bem-101/)
* [Getting your head around BEM syntax (CSS Wizardry)](http://csswizardry.com/2013/01/mindbemding-getting-your-head-round-bem-syntax/)
* [CSS for BEM (bem.info)](https://en.bem.info/methodology/css/)
* [CSS Guidelines](https://cssguidelin.es/)

## Concepts

### Think in terms of components

Think in terms of everything as a component: a button, a footer with buttons in
it, a list, a list item, the container around the list, the list title, etc.

Keep components as granular as possible.

Compose large, complex components out of smaller, simpler components.

### Introduce as little specificity as possible

Rules will need to overwrite other rules, and we can only do that via
specificity. For that reason, it's important to avoid introducing specificity
unless absolutely needed and that when we do so, we introduce as little as
possible.

## Quick reference

Here are some examples of how to structure your styles. The
rules that underly these examples are below.

```less
.localNavButton {
  padding: 5px;
  border: 1px solid black;
  
  /**
   * 1. This button can appear in a "pressed" aka "pinned" state.
   */
  &.localNavButton-isPressed {
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2); /* 1 */
  }
}

  /**
   * 1. Center icon and text vertically.
   */
  .localNavButton__icon,
  .localNavButton__text {
    display: inline-block; /* 1 */
    vertical-align: middle; /* 1 */
  }

  .localNavButton__icon {
    color: gray;
    opacity: 0.5;
  }

  .localNavButton__text {
    color: black;
  }

.localNavButton--primary {
  border-color: blue;

  // Introduce specificity to color the descendant component.
  .localNavButton__icon,
  .localNavButton__text {
    color: blue;
  }
}
```

```html
<button class="localNavButton localNavButton--primary">
  <div class="localNavButton__icon fa fa-check"></div>
  <div class="localNavButton__text">Submit</div>
</button>
```

## Rules

### Use uniquely-named "base classes" to represent components

This component will be represented in the styles as a **base class**:

```less
// We can use a namespace like "kb" to make sure we don't affect
// other styles accidentally, especially when we're using a generic
// name like "button".
.localNavButton {
  background-color: gray;
  color: black;
  border-radius: 4px;
  padding: 4px;
}
```

### Create "descendant classes" to represent child components which can't stand on their own

In this example, the text and the icon are very tightly coupled to the button
component. They aren't supposed to be used outside of this component. So we
can indicate this parent-child relationship with a double-underscore and by
indenting the **descendant classes**.

```less
.localNavButton {
  /* ... */
}

  .localNavButton__icon {
    display: inline-block;
    vertical-align: middle;
  }

  .localNavButton__text {
    display: inline-block;
    vertical-align: middle;
    font-weight: 300;
  }
```

```html
<button class="localNavButton">
  <div class="localNavButton__icon fa fa-trophy"></div>
  <div class="localNavButton__text">Winner</div>
</button>
```

### Think of deeply-nested child components as "subcomponents" instead of descendants

Some components can have subcomponents that have their own subcomponents, and so on.
In this kind of situation, using the descendant class rule above, would get
pretty hairy. Consider a table component:

```less
// ======================== Bad! ========================
// These styles are complex and the multiple double-underscores increases noise
// without providing much useful information.
.kuiTable {
  /* ... */
}

  .kuiTable__body {
    /* ... */
  }

    .kuiTable__body__row {
      /* ... */
    }

      .kuiTable__body__row__cell {
        /* ... */
      }
```

In this situation, it's better to create separate subcomponent base classes
in their own files. It's important to still name the classes in a way that
indicates their relationship, by incorporating the name of the root base class.

```less
// kbTable.less
.kuiTable {
  /* ... */
}
```

```less
// kbTableBody.less
.kuiTableBody {
  /* ... */
}
```

```less
// kbTableRow.less
.kuiTableRow {
  /* ... */
}

  .kuiTableRow__cell {
    /* ... */
  }
```

This is an example of how we can use files and class names to scale a component
as it grows in complexity.

### Represent states with "state classes"

If a user interacts with a component, or a change in application state needs to
be surfaced in the UI, then create **state classes**. These classes will be applied
to components in response to these changes.

Notice that all states contain a boolean keyword, typically "is".

```less
.localNavButton {
  /* ... */

  /**
   * 1. This button can appear in a "pressed" aka "pinned" state.
   */
  &.localNavButton-isPressed {
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2); /* 1 */
  }
}
```

### Variations on a component are represented with "modifier classes"

If the UI calls for a component to change along a single axis of semantic
meaning, create modifier classes. **Modifier classes** are different than states,
in that they will not be applied to a component as a result of user interaction
or a change in application state.

```less
.localNavButton {
  /* ... */
}

.localNavButton--primary {
  color: white;
  background-color: blue;
}

.localNavButton--danger {
  color: white;
  background-color: red;
}
```

```html
<button class="localNavButton localNavButton--danger">
  Delete everything
<button>
```

### Don't use multiple modifier classes together

If the design calls for buttons that look like this:

```
+------------+
|            |
|   Button   |
|            |
+------------+
+------------+
|            |
|   BUTTON   |
|            |
+------------+
```

It might be tempting to create modifiers that can be combined, like this:

```less
// ======================== Bad! ========================
.localNavButton--large {
  padding: 20px;
}

.localNavButton--loud {
  text-transform: uppercase;
}
```

```html
<button class="localNavButton localNavButton--large">
  Button
</button>
<button class="localNavButton localNavButton--large localNavButton--loud">
  Button
</button>
```

Down this path lies trouble. Each class loses its semantic meaning and essentially
becomes an inline style. So usually trying to use multiple modifier classes
together is a _code smell_.

Instead of this, it's important to **talk with the designer** and assign a semantic
name to each of these types of buttons, which can then be reflected with
unique base or modifier classes. Discussing use cases and defining the role of
the component is a good way to approach this conversation.

```
+---------------------+
|                     |
|   Call-out button   |
|                     |
+---------------------+
+-----------------------------+
|                             |
|   PRIMARY CALL-OUT BUTTON   |
|                             |
+-----------------------------+
```

```less
// This button is used for calls-to-action, e.g. "Sign up for our newsletter".
// Generally, no more than one will ever appear on a given page.
.localNavCallOutButton {
  background-color: gray;
  color: black;
  border-radius: 4px;
  padding: 20px;
}

.localNavCallOutButton--primary {
  text-transform: uppercase;
}
```

```html
<button class="localNavCallOutButton">
  Call-out button
</button>
<button class="localNavCallOutButton localNavCallOutButton--primary">
  Primary call-out button
</button>
```

### How to apply DRY

The above example might look WET to you, since the localNavButton and
localNavCallOutButton have so many common properties.

In general, it's more important to keep styles tightly-scoped to clearly-defined
components (which increases readability and maintainabilty) than it is to keep
them DRY.

But if you really think there is a compelling reason to deduplicate code, then
try using a mixin.

```less
// Use the suffix "mixin" to avoid confusing this with a base class.
.localNavButtonMixin {
  background-color: gray;
  color: black;
  border-radius: 4px;
}

.localNavButton {
  &:extend(.localNavButtonMixin all);
}

.localNavCallOutButton {
  &:extend(.localNavButtonMixin all);
}
```

#### Compelling reasons for using mixins

A super-compelling reason to use mixins is if you see that a set of different
components have a set of the same rules applied to all of them, and that it's
likely that any change made to one of them will have to made to the rest, too
(it might be a good idea to double-check this with the designer).

In this case, a mixin can be very useful because then you only need to make the
change in one place. Consider the above `localNavButtonMixin` example. Now if the
border-radius changes for all buttons, you only need to change it there. Or if
the designers anticipate that all new types of buttons should have the same
border-radius, then you can just extend this mixin when you create a new button
base class.

### The Open/Closed Principle

References:

* [The Open/Closed Principle on bem.info](https://en.bem.info/methodology/css/#openclosed-principle)
* [The Open/Closed Principle in CSS Guidelines](https://cssguidelin.es/#the-openclosed-principle)
* [The Open/Closed Principle on Wikipedia](https://en.wikipedia.org/wiki/Open/closed_principle)

Formally the open/closed principle reads

> Software entities (classes, modules, functions, etc.) should be **open for 
> extension**, but **closed for modification**.

Applied to CSS, this means that CSS rulesets should be treated as immutable. 
Once a declaration block for a specific selector has been defined, its style 
should not be overridden in a different ruleset using the same selector:

```css
// BAD
.button {
  color: blue;
  font-size: 1.5em;
  padding: 16px;
}

.header .button {
  font-size: 1em;
  padding: 4px;
}
```

Not only does this example violate the semantics of a BEM block, it also 
**modifies** the meaning of `.button` depending on the context. Instead, this 
could be expressed using a block modifier or a completely separate class which 
is kept DRY using mixins:

```css
// GOOD
.button {
  color: blue;
  font-size: 1.5em;
}

  .button--small {
    font-size: 1em;
    padding: 4px;
  }
```

#### Exception: Block Groups

It is a common occurrence that groups of blocks within a container should be 
styled differently that single blocks in order to indicate their association. 
But using pure BEM mixes of blocks and group modifiers would sometimes require 
a large number of modifiers to be applied to multiple elements to achieve that, 
e.g.:

```css
.kuiCard { /* ... */ }

  .kuiCard__description { /* ... */ }

.kuiCardGroup { /* ... */ }

  .kuiCardGroup__card { /* ... */ }

  .kuiCardGroup__cardDescription { /* ... */ }
```

```html
<div class="kuiCardGroup">
  <div class="kuiCard kuiCardGroup__card">
    <div class="kuiCard__description kuiCardGroup__cardDescription">
      Card Description
    </div>
  </div>
</div>
```

To avoid the combinatorial explosion of classes with such groupings and thier 
modifiers, it is permissible to nest a block's selector under another block's 
selector if:

* The relationship is of a very narrow "`element` to `elementGroup`" kind that 
  is apparent from the block names.
* The rulesets are colocated in the same component directory.

```css
.kuiCard { /* ... */ }

  .kuiCard__description { /* ... */ }

.kuiCardGroup { /* ... */ }

.kuiCardGroup .kuiCard { /* ... */ }

.kuiCardGroup .kuiCard__description { /* ... */ }
```

#### Exception: Normalization/Reset

We cannot control the selectors introduced by third-party stylesheets and these 
selectors may not adhere to our styleguide, e.g. `a` or `input[type="text"]`. 
In these cases, we are forced to duplicate these selectors within our own 
stylesheets and override those styles to control their look and feel.

When this happens, it is important to add comments that make it clear why these 
selectors exist and which third-party dependencies they override. We should 
also define these selectors in files which refer back to the dependency, e.g. a 
file named `ui_select_overrides.less` will contain styles overriding those 
introduced by the `ui-select` dependency.
