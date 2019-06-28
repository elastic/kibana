# Accessibility (A11Y) Guide

This document provides some technical guidelines how to prevent several common
accessibility issues.

## Naming elements

### `aria-label` and `aria-labelledby`

Every element on a page will have a name, that is read out to an assistive technology
like a screen reader. This will for most elements be the content of the element.
For form elements it will be the content of the associated `<label>` (see below).

You can overwrite that name, that is read out, by specifying a new name via the
`aria-label` attribute. This must e.g. be done, if the element itself has no
visual text representation (e.g. an icon button):

```html
<button aria-label="Add filter"><span class="fa fa-plus"></span></button>
```

If you have to use a form element without a related `<label>` element, you can use `aria-label`
directly on the form element to provide labeling information to screen readers.

If the actual name for that element is already present in another element,
you can use `aria-labelledby` to reference the id of that element:

```html
<div id="datepicker">Date Picker</div>
<button aria-labelledby="datepicker"><span class="fa fa-calendar"></span></button>
```

### Label every form element

You should add a label for every form element:

```html
<label for="interval">Interval</label>
<select id="interval"><!-- ... --></select>
```

If one label references multiple form elements, you can use the reverse logic
and add `aria-labelledby` to all form elements:

```html
<label id="fromLabel">From</label>
<input type="number" aria-labelledby="fromLabel">
<input type="number" aria-labelledby="fromLabel">
<input type="number" aria-labelledby="fromLabel">
```

You should always prefer the `<label for>` solution, since it also adds benefit
for every user, by making the label clickable, to directly jump to the form
element (or in case of checkboxes and radio buttons directly check them).

#### How to generate ids?

When labeling elements (and for some other accessibility tasks) you will often need
ids. Ids must be unique within the page i.e. no duplicate ids in the rendered DOM
at any time.

Since we have some components that are used multiple times on the page, you must
make sure every instance of that component has a unique `id`. To make the generation
of those `id`s easier, you can use the `htmlIdGenerator` service in the `@kbn/ui-framework/services`.

A react component could use it as follows:

```jsx
import { htmlIdGenerator } from '@kbn/ui-framework/services';

render() {
  // Create a new generator that will create ids deterministic
  const htmlId = htmlIdGenerator();
  return (<div>
    <label htmlFor={htmlId('agg')}>Aggregation</label>
    <input id={htmlId('agg')}/>
  </div>);
}
```

Each id generator you create by calling `htmlIdGenerator()` will generate unique but
deterministic ids. As you can see in the above example, that single generator
created the same id in the label's `htmlFor` as well as the input's `id`.

A single generator instance will create the same id when passed the same argument
to the function multiple times. But two different generators will produce two different
ids for the same argument to the function, as you can see in the following example:

```js
const generatorOne = htmlIdGenerator();
const generatorTwo = htmlIdGenerator();

// Those statements are always true:
// Same generator
generatorOne('foo') === generatorOne('foo');
generatorOne('foo') !== generatorOne('bar');

// Different generator
generatorOne('foo') !== generatorTwo('foo')
```

This allows multiple instances of a single react component to now have different ids.
If you include the above react component multiple times in the same page,
each component instance will have a unique id, because each render method will use a different
id generator.

You can use this service of course also outside of react.

### Don't use the `title` attribute

**TL;DR** *Don't use the `title` attribute, use tooltips, `aria-label`, etc. instead.*

The `title` has no clear role within the accessibility standards.
[See the HTML5 spec](http://w3c.github.io/html/dom.html#the-title-attribute) for more information.

To provide supplementary, descriptive information about a form control, button, link, or other element,
that should also be visible to non vision impaired users, use a tooltip component instead.

If you need a label only for screen readers use `aria-label`.

**Additional reading:**

* https://www.paciellogroup.com/blog/2010/11/using-the-html-title-attribute/
* https://www.paciellogroup.com/blog/2012/01/html5-accessibility-chops-title-attribute-use-and-abuse/
* https://www.deque.com/blog/text-links-practices-screen-readers/

## Interactive elements

### Use `<button>` and `<a href>`

**TL;DR** *Use `<button>` or `<a>` (with `href`) instead of click listeners on other elements
and style it whatever way you need.*

If you want to make an element clickable, use a `<button>` or `<a href>` element for it.
Use a `<button>` whenever it causes an action on the current page, and an `<a href>` if it
navigates to a different page. You can use click listeners just fine on these elements.

An `<a>` element must have an `href` attribute, so that (a) it will be correctly perceived
as a link by a screen reader and (b) that registered click listener will correctly
trigger on pressing <kbd>Enter</kbd>. If you don't need it, make it `href="#"`
and call `preventDefault()` on the click event.

*Why not use other elements?*

If you create e.g. a `<div>` with a click listener (like `<div ng-click="ctrl.doSomething()">...</div>`)
you will create multiple accessibility issues:

* The element is not *keyboard accessible*, meaning:
  * You cannot focus it by pressing <kbd>tab</kbd>. You can add this behavior by
    adding `tabindex="0"` to the element.
  * You cannot trigger the click by pressing <kbd>Enter</kbd> or <kbd>Space</kbd>.
    We have a `kbn-accessible-click` directive for AngularJS and a `KuiKeyboardAccessible`
    React component to add that behavior.
* Even if you make it keyboard accessible, a user using a screen reader won't
  recognize, that the div is actually an interactive element, the screen reader
  will just announce something like: "Sort". You would need
  to add `role="button"` or `role="link"` to it, so that the screen reader would
  actually announce something like "Sort, button" and give the user the required
  information, that this element is interactive.

You will need quite some work just to rebuild native logic of a button (and we haven't
even touched disabled states, etc.). It is most of the time easier to just use
a `button` or an `a` and style this, whatever way you want it to look (even if
you don't want it to look like a button at all).

### tabindex and id

**TL;DR** *Only use `tabindex="0"` and `tabindex="-1"` and no values above 0. Always
add an `id` to an element with `tabindex`.*

If you want to make an element focusable, that doesn't offer this feature by default
(i.e. isn't an form element or a link), you can add `tabindex` with a value >= 0 to it.

*Why shouldn't you use values above 0?*

Setting `tabindex="0"` will add the element to the tabbing order at the position
it is in the DOM. Setting it to something above 0 will create an explicit order.
Tabbing will always focus all elements with an tabindex > 0, starting from the smallest
number. After all those elements has been tabbed, it will continue with all `tabindex="0"`
or implicit tabable elements. These values are not scoped to a subtree of the
DOM, but are global values. Maintaining a global order is nearly impossible
and considered a [serious issue](https://dequeuniversity.com/rules/axe/1.1/tabindex)
by automated accessibility testing frameworks.

`tabindex="-1"` will remove an element from tab order, that would be focusable
otherwise. You won't need this often.

*Why should you add an `id`?*

Due to some bugs in some common screen readers, you will always need to add an `id`
to an element with `tabindex`, since they wouldn't pick up the `tabindex` correctly
otherwise.

### Tooltips

**TL;DR** *Add `role="tooltip"` and `aria-describedby` to elements for accessible tooltips.*

Elements which act as tooltips should have the `role="tooltip"` attribute and an ID to which the
described element can point to with the `aria-describedby` attribute. For example:

```html
<div
  class="kuiTooltip"
  role="tooltip"
  id="visualizationsTooltip"
>
  Visualizations help you make sense of your data.
</div>

<button aria-describedby="visualizationsTooltip">
 Visualizations
</button>
```

### Don't create keyboard traps

**TL;DR** *If you can't leave an element with <kbd>Tab</kbd> again, it needs a special interaction model.*

If an interactive element consumes the <kbd>Tab</kbd> key (e.g. a code editor to
create an actual tabular indentation) it will prevent a keyboard user to leave
that element again. Also see [WCAG 2.1.2](https://www.w3.org/TR/WCAG20/#keyboard-operation-trapping).

Those kind of elements, require a special interaction model. A [code editor](https://github.com/elastic/kibana/pull/13339)
could require an <kbd>Enter</kbd> keypress before starting editing mode, and
could leave that mode on <kbd>Escape</kbd> again.

Unfortunately there is no universal solution for this problem, so be aware when creating
such elements, that would consume tabbing, to think about an accessible interaction
model.

*Hint:* If you create that kind of interactive elements `role="application"` might
be a good `role` (also see below) for that element. It is meant for elements providing
their own interaction schemes.

## Roles

Each DOM element has an implicit role in the accessibility tree (that assistive technologies
use). The mapping of elements to default roles can be found in the
[Accessibility API Mappings](https://www.w3.org/TR/html-aam-1.0/#html-element-role-mappings).
You can overwrite this role via the `role` attribute on an element, and the
assistive technology will now behave the same like any other element with that role
(e.g. behave like it is a button when it has `role="button"`).

### Landmark roles

Some roles can be used to declare so called landmarks. These landmarks tag important
parts of a web page. Screen readers offer a quick way to jump to these
parts of the page (*landmark navigation*).

#### role=main

The `main` role (or equivalent using the `<main>` tag) declares the main part
of a page. This can be used in the landmark navigation to quickly jump to the
actual main area of the page (and skip all headers, navigations, etc.).

#### `<section>`

The `<section>` element, can be used to mark a region on the page, so that it
appears in the landmark navigation. The section element therefore needs to have
an *accessible name*, i.e. you should add an `aria-label`, that gives a short
title to that section of the page.

### role=search

**TL;DR** *Place `role="search"` neither on the `<input>` nor the `<form>`, but
some `div` in between.*

Role search can be used to mark a region as used for searching. This can be used
by assistive technologies to quickly find and navigate to this section.

If you place it on the `input` you will overwrite the implicit `textbox` or `searchbox`
role, and as such confuse the user, since it loses it meaning as in input element.
If you place it on the `form` element you will also overwrite its role and
remove it from a quick jump navigation to all forms.

That's why it should be placed to an `div` (or any other container) between the
`form` and the `input`. In most cases we already have a div there that you can
easily put this role to.

**Related Links:**

* [Where to put your search role?](http://adrianroselli.com/2015/08/where-to-put-your-search-role.html)
* Discussions about making `search` role inherit the `form` role:
  [wcag/113](https://github.com/w3c/wcag/issues/113),
  [html-aria/118](https://github.com/w3c/html-aria/issues/18),
  [aria/85](https://github.com/w3c/aria/issues/85)
