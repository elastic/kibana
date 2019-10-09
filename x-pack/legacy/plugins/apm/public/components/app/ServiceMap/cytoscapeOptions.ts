/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import cytoscape from 'cytoscape';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { icons, defaultIcon } from './icons';

const layout = {
  animate: true,
  animationEasing: theme.euiAnimSlightBounce as cytoscape.Css.TransitionTimingFunction,
  animationDuration: parseInt(theme.euiAnimSpeedFast, 10),
  name: 'dagre',
  nodeDimensionsIncludeLabels: true,
  rankDir: 'LR',
  spacingFactor: 2
};

function isDatabaseOrExternal(agentName: string) {
  return agentName === 'database' || agentName === 'external';
}

const style: cytoscape.Stylesheet[] = [
  {
    selector: 'node',
    style: {
      'background-color': 'white',
      // The DefinitelyTyped definitions don't specify that a function can be
      // used here.
      //
      // @ts-ignore
      'background-image': (el: cytoscape.NodeSingular) =>
        icons[el.data('agentName')] || defaultIcon,
      'background-height': (el: cytoscape.NodeSingular) =>
        isDatabaseOrExternal(el.data('agentName')) ? '40%' : '80%',
      'background-width': (el: cytoscape.NodeSingular) =>
        isDatabaseOrExternal(el.data('agentName')) ? '40%' : '80%',
      'border-color': (el: cytoscape.NodeSingular) =>
        el.hasClass('primary')
          ? theme.euiColorSecondary
          : theme.euiColorMediumShade,
      'border-width': 2,
      color: theme.textColors.default,
      // theme.euiFontFamily doesn't work here for some reason, so we're just
      // specifying a subset of the fonts for the label text.
      'font-family': 'Inter UI, Segoe UI, Helvetica, Arial, sans-serif',
      'font-size': theme.euiFontSizeXS,
      height: theme.avatarSizing.l.size,
      label: 'data(id)',
      'min-zoomed-font-size': theme.euiSizeL,
      'overlay-opacity': 0,
      shape: (el: cytoscape.NodeSingular) =>
        isDatabaseOrExternal(el.data('agentName')) ? 'diamond' : 'ellipse',
      'text-background-color': theme.euiColorLightestShade,
      'text-background-opacity': 0,
      'text-background-padding': theme.paddingSizes.xs,
      'text-background-shape': 'roundrectangle',
      'text-margin-y': theme.paddingSizes.s,
      'text-max-width': '85px',
      'text-valign': 'bottom',
      'text-wrap': 'ellipsis',
      width: theme.avatarSizing.l.size
    }
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'line-color': theme.euiColorMediumShade,
      'overlay-opacity': 0,
      'target-arrow-color': theme.euiColorMediumShade,
      'target-arrow-shape': 'triangle',
      // The DefinitelyTyped definitions don't specify this property since it's
      // fairly new.
      //
      // @ts-ignore
      'target-distance-from-node': theme.paddingSizes.xs,
      width: 2
    }
  }
];

export const cytoscapeOptions: cytoscape.CytoscapeOptions = {
  autoungrabify: true,
  autounselectify: true,
  boxSelectionEnabled: false,
  layout,
  maxZoom: 3,
  minZoom: 0.2,
  style
};
