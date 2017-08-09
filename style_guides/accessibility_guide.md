# Accessibility (A11Y) Guide

This document provides some technical guidelines how to prevent several common
accessibility issues.

## Interactive elements

### Use `<button>` and `<a>`

**TL;DR** *Use `<button>` and `<a>` (with `hred`) instead of click listeners on other elements
and style it whatever way you need.*

If you want to make an element clickable, use a `<button>` or `<a>` element for it.
Use a *button* whenever it causes an action on the current page, and an *a* if it
navigates to a different page. You can use click listeners just fine on these elements.

An `a` element must have an `href` attribute, so that (a) it will be correctly perceived
as a link by a screen reader and (b) that registered click listener will correctly
trigger on pressing <kbd>Enter</kbd>. If you don't need it, make it `hred="#"`
and call `preventDefault()` on the click event.

*Why not use other elements?*

If you create e.g. a *div* with a click listener (like `<div ng-click="ctrl.doSomething()">...</div>`)
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

## Miscellaneous

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
