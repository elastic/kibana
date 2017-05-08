
# HTML Style Guide

## Multiple attribute values

When an element has multiple attributes, each attribute including the first should be on its own line with a single indent.
This makes the attributes easier to scan and compare across similar elements.

The closing bracket should be on its own line. This allows attributes to be shuffled and edited without having to move the bracket around. It also makes it easier to scan vertically and match opening and closing brackets. This format
is inspired by the positioning of the opening and closing parentheses in [Pug/Jade](https://pugjs.org/language/attributes.html#multiline-attributes).

```
<div
  attribute1="value1"
  attribute2="value2"
  attribute3="value3"
>
  Hello
</div>
```

If the element doesn't have children, add the closing tag on the same line as the opening tag's closing bracket.

```
<div
  attribute1="value1"
  attribute2="value2"
  attribute3="value3"
></div>
```

## Accessibility

### Don't use the `title` attribute

The `title` has no clear role within the accessibility standards. 
[See the HTML5 spec](http://w3c.github.io/html/dom.html#the-title-attribute) for more information.

To provide supplementary, descriptive information about a form control, button, link, or other element, use
a tooltip component instead.

Additional reading:

* https://www.paciellogroup.com/blog/2010/11/using-the-html-title-attribute/
* https://www.paciellogroup.com/blog/2012/01/html5-accessibility-chops-title-attribute-use-and-abuse/
* https://www.deque.com/blog/text-links-practices-screen-readers/

### Tooltips

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