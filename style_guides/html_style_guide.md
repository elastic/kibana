
# HTML Style Guide

## Multiple attribute values

When a node has multiple attributes, each attribute including the first should be on its own line with a single indent.

The closing bracket should be on its own line. This allows attributes to be shuffled and edited without having to move the bracket around. It also makes it easier to scan vertically and match opening and closing brackets.

```
<div
  attribute1="value1"
  attribute2="value2"
  attribute3="value3"
>
  Hello
</div>
```

If the node doesn't have child notes, add the closing tag on the same line as the opening tag's closing bracket.

```
<div
  attribute1="value1"
  attribute2="value2"
  attribute3="value3"
></div>
```