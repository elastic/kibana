import React from 'react';

import ReactTooltip from 'react-tooltip';

/**
 * Wrap elements inside KuiTooltip to provide a popup tooltip on hover.
 *
 * TODO: This has the unfortunate side affect of attaching a ReactTooltip to every element, when
 * it's not neccessary to do so. Unfortunately, because of our angular -> react migration, it's
 * not easy to have a single reference to ReactTooltip that every element can reference.
 *
 * @param text
 * @param children
 * @returns {XML}
 * @constructor
 */
export function KuiTooltip({ text, children }) {
  return <div>
      <div data-tip={ text } data-for={ text }>
        { children }
      </div>
      <ReactTooltip place="bottom" id={ text }>{ text }</ReactTooltip>
    </div>;
}
