# Cloud Security Posture's Graph

## Motivation

The idea behind this package is to have a reusable graph component, embedding the features available to the alert's flyout in
security solution plugin.

## How to use this

### Step 1: Import the Component

First, import the `Graph` component into your desired file.

```tsx
import { Graph } from '@kbn/cloud-security-posture-graph';
```

### Step 2: Prepare the Data

Create the nodes and edges data models. These should follow the `NodeViewModel` and `EdgeViewModel` interfaces.

```tsx
const nodes: NodeViewModel[] = [
  {
    id: 'node1',
    label: 'Node 1',
    color: 'primary',
    shape: 'ellipse',
    icon: 'user',
  },
  {
    id: 'node2',
    label: 'Node 2',
    color: 'primary',
    shape: 'hexagon',
    icon: 'questionInCircle',
  },
];

const edges: EdgeViewModel[] = [
  {
    id: 'edge1',
    source: 'node1',
    target: 'node2',
    color: 'primary',
  },
];
```

### Step 3: Render the Component

Use the `Graph` component in your JSX/TSX, passing the nodes, edges, and interactivity flag as props.

```tsx
<Graph nodes={nodes} edges={edges} interactive={true} />
```

### Example Usage

Here is a complete example of how to use the `Graph` component in a React component.

```tsx
import React from 'react';
import { Graph } from '@kbn/cloud-security-posture-graph';
import type { NodeViewModel, EdgeViewModel } from '@kbn/cloud-security-posture-graph';

const App: React.FC = () => {
  const nodes: NodeViewModel[] = [
    {
      id: 'node1',
      label: 'Node 1',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
    },
    {
      id: 'node2',
      label: 'Node 2',
      color: 'primary',
      shape: 'hexagon',
      icon: 'questionInCircle',
    },
  ];

  const edges: EdgeViewModel[] = [
    {
      id: 'edge1',
      source: 'node1',
      target: 'node2',
      color: 'primary',
    },
  ];

  return (
    <div>
      <h1>Graph Visualization</h1>
      <Graph nodes={nodes} edges={edges} interactive={true} />
    </div>
  );
};

export default App;
```

### Storybook Example

You can also see how the `Graph` component is used in the Storybook file `graph_layout.stories.tsx`. 

### Extras

Be sure to check out provided helpers

## Storybook

General look of the component can be checked visually running the following storybook:
`yarn storybook cloud_security_posture_packages`

Note that all the interactions are mocked.