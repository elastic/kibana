/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import { EuiFlexItem, EuiFlexGrid } from '@elastic/eui';
import { ElementControls } from './element_controls';
import { CustomElement, ElementSpec } from '../../../types';
import { ElementCard } from '../element_card';

export interface Props {
  /**
   * list of elements to generate cards for
   */
  elements: Array<ElementSpec | CustomElement>;
  /**
   * text to filter out cards
   */
  filterText: string;
  /**
   * tags to filter out cards
   */
  filterTags: string[];
  /**
   * indicate whether or not edit/delete controls should be displayed
   */
  showControls: boolean;
  /**
   * handler invoked when clicking a card
   */
  handleClick: (element: ElementSpec | CustomElement) => void;
  /**
   * click handler for the edit button
   */
  onEdit?: (element: ElementSpec | CustomElement) => void;
  /**
   * click handler for the delete button
   */
  onDelete?: (element: ElementSpec | CustomElement) => void;
}

export const ElementGrid = ({
  elements,
  filterText,
  filterTags,
  handleClick,
  onEdit,
  onDelete,
  showControls,
}: Props) => {
  filterText = filterText.toLowerCase();

  return (
    <EuiFlexGrid gutterSize="l" columns={4}>
      {map(elements, (element: ElementSpec | CustomElement, index) => {
        const { name, displayName = '', help = '', image, tags = [] } = element;
        const whenClicked = () => handleClick(element);
        let textMatch = false;
        let tagsMatch = false;

        if (
          !filterText.length ||
          name.toLowerCase().includes(filterText) ||
          displayName.toLowerCase().includes(filterText) ||
          help.toLowerCase().includes(filterText)
        ) {
          textMatch = true;
        }

        if (!filterTags.length || filterTags.every(tag => tags.includes(tag))) {
          tagsMatch = true;
        }

        if (!textMatch || !tagsMatch) {
          return null;
        }

        return (
          <EuiFlexItem key={index} className="canvasElementCard__wrapper">
            <ElementCard
              title={displayName || name}
              description={help}
              image={image}
              tags={tags}
              onClick={whenClicked}
            />
            {showControls && onEdit && onDelete && (
              <ElementControls onEdit={() => onEdit(element)} onDelete={() => onDelete(element)} />
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGrid>
  );
};

ElementGrid.propTypes = {
  elements: PropTypes.array.isRequired,
  handleClick: PropTypes.func.isRequired,
  showControls: PropTypes.bool,
};

ElementGrid.defaultProps = {
  showControls: false,
  filterTags: [],
  filterText: '',
};
