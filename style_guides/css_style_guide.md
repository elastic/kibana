
# CSS Style Guide

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
.kbButton {
  padding: 5px;
  border: 1px solid black;
  
  /**
   * 1. This button can appear in a "pressed" aka "pinned" state.
   */
  &.is-button-pressed {
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2); /* 1 */
  }
}

  /**
   * 1. Center icon and text vertically.
   */
  .kbButton__icon,
  .kbButton__text {
    display: inline-block; /* 1 */
    vertical-align: middle; /* 1 */
  }

  .kbButton__icon {
    color: gray;
    opacity: 0.5;
  }

  .kbButton__text {
    color: black;
  }

.kbButton--primary {
  border-color: blue;

  // Introduce specificity to color the descendant component.
  .kbButton__icon,
  .kbButton__text {
    color: blue;
  }
}
```

```html
<button class="kbButton kbButton--primary">
  <div class="kbButton__icon">Submit</div>
  <div class="kbButton__text">Submit</div>
</button>
```

## Rules

### Use uniquely-named "base classes" to represent components

This component will be represented in the styles as a **base class**:

```less
// We can use a namespace like "kb" to make sure we don't affect
// other styles accidentally, especially when we're using a generic
// name like "button".
.kbButton {
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
.kbButton {
  /* ... */
}

  .kbButton__icon {
    display: inline-block;
    vertical-align: middle;
  }

  .kbButton__text {
    display: inline-block;
    vertical-align: middle;
    font-weight: 300;
  }
```

```html
<button class="kbButton">
  <div class="kbButton__icon fa fa-trophy"></div>
  <div class="kbButton__text">Winner</div>
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
.kbTable {
  /* ... */
}

  .kbTable__body {
    /* ... */
  }

    .kbTable__body__row {
      /* ... */
    }

      .kbTable__body__row__cell {
        /* ... */
      }
```

In this situation, it's better to create separate subcomponent base classes
in their own files. It's important to still name the classes in a way that
indicates their relationship, by incorporating the name of the root base class.

```less
// kbTable.less
.kbTable {
  /* ... */
}
```

```less
// kbTableBody.less
.kbTableBody {
  /* ... */
}
```

```less
// kbTableRow.less
.kbTableRow {
  /* ... */
}

  .kbTableRow__cell {
    /* ... */
  }
```

This is an example of how we can use files and class names to scale a component
as it grows in complexity.

### Represent states with "state classes"

If a user interacts with a component, or a change in application state needs to
be surfaced in the UI, then create **state classes**. These classes will be applied
to components in response to these changes.

Notice that all states begin with a boolean keyword, typically "is-".

```less
.kbButton {
  /* ... */

  /**
   * 1. This button can appear in a "pressed" aka "pinned" state.
   */
  &.is-button-pressed {
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
.kbButton {
  /* ... */
}

.kbButton--primary {
  color: white;
  background-color: blue;
}

.kbButton--danger {
  color: white;
  background-color: red;
}
```

```html
<button class="kbButton kbButton--danger">
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
.kbButton--large {
  padding: 20px;
}

.kbButton--loud {
  text-transform: uppercase;
}
```

```html
<button class="kbButton kbButton--large">
  Button
</button>
<button class="kbButton kbButton--large kbButton--loud">
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
.kbCallOutButton {
  background-color: gray;
  color: black;
  border-radius: 4px;
  padding: 20px;
}

.kbCallOutButton--primary {
  text-transform: uppercase;
}
```

```html
<button class="kbCallOutButton">
  Call-out button
</button>
<button class="kbCallOutButton kbCallOutButton--primary">
  Primary call-out button
</button>
```

### How to apply DRY

The above example might look counter-DRY to you, since the kbButton and
kbCallOutButton have so many common properties.

In general, it's more important to keep styles tightly-scoped to clearly-defined
components (which increases readability and maintainabilty) than it is to keep
them DRY.

But if you really think there is a compelling reason to deduplicate code, then
try using a mixin.

```less
// Use the suffix "mixin" to avoid confusing this with a base class.
.kbButtonMixin {
  background-color: gray;
  color: black;
  border-radius: 4px;
}

.kbButton {
  &:extend(.kbButtonMixin all);
}

.kbCallOutButton {
  &:extend(.kbButtonMixin all);
}
```

#### Compelling reasons for using mixins

A super-compelling reason to use mixins is if you see that a set of different
components have a set of the same rules applied to all of them, and that it's
likely that any change made to one of them will have to made to the rest, too
(it might be a good idea to double-check this with the designer).

In this case, a mixin can be very useful because then you only need to make the
change in one place. Consider the above `kbButtonMixin` example. Now if the
border-radius changes for all buttons, you only need to change it there. Or if
the designers anticipate that all new types of buttons should have the same
border-radius, then you can just extend this mixin when you create a new button
base class.
