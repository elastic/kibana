# HTML Style Guide

## Camel case ID and other attribute values

Use camel case for the values of attributes such as IDs and data test subject selectors.

```html
<button
  id="veryImportantButton"
  data-test-subj="clickMeButton"
>
  Click me
</button>
```

The only exception is in cases where you're dynamically creating the value, and you need to use
hyphens as delimiters:

```html
<button
  ng-repeat="button in buttons"
  id="{{ 'veryImportantButton-' + button.id }}"
  data-test-subj="{{ 'clickMeButton-' + button.id }}"
>
  {{ button.label }}
</button>
```

## Capitalization in HTML and CSS should always match

It's important that when you write CSS selectors using classes, IDs, and attributes
(keeping in mind that we should _never_ use IDs and attributes in our selectors), that the
capitalization in the CSS matches that used in the HTML. [HTML and CSS follow different case sensitivity rules](http://reference.sitepoint.com/css/casesensitivity), and we can avoid subtle gotchas by ensuring we use the
same capitalization in both of them.
