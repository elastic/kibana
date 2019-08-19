# Editor Component

This re-usable code editor component was built as a layer of abstraction on top of the Monaco Code Editor (and the React Monaco Editor component). The goal of this component is to expose a set of the most-used, most-helpful features from Monaco in a way that's easy to use out of the box. If a use case requires additional features, this component still allows access to all other Monaco features.

This editor component allows easy access to:
* Syntax highlighting (including custom language highlighting)
* Suggestion/autocompletion widget
* Function signature widget 
* Hover widget

_TODO: Examples of each_

The Monaco editor doesn't automatically resize the editor area on window or container resize so this component includes a resize detector to cause the Monaco editor to re-layout and adjust its size when the window or container size changes. 