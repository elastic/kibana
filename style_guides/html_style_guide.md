
# HTML Style Guide

## Multiple attribute values

When a node has multiple attributes that would cause it to exceed the 80-character line limit, each attribute including the first should be on its own line with a single indent. Also, when a node that is styled in this way has child nodes, there should be a blank line between the opening parent tag and the first child tag.

```
<ul
  attribute1="value1"
  attribute2="value2"
  attribute3="value3">

  <li></li>
  <li></li>
  ...
</ul>
```
