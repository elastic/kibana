/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MutableRefObject } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import {
  ColorMapping,
  DEFAULT_COLOR_MAPPING_CONFIG,
  CategoricalColorMapping,
  SPECIAL_TOKENS_STRING_CONVERSION,
  getColorsFromMapping,
} from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import { KbnPalettes } from '@kbn/palettes';
import { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { SerializedValue } from '@kbn/data-plugin/common';
import { PalettePanelContainer } from './palette_panel_container';

interface ColorMappingByTermsProps {
  isDarkMode: boolean;
  colorMapping?: ColorMapping.Config;
  palettes: KbnPalettes;
  isInlineEditing?: boolean;
  setColorMapping: (colorMapping?: ColorMapping.Config) => void;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  categories: SerializedValue[];
  formatter?: IFieldFormat;
  allowCustomMatch?: boolean;
}

export function ColorMappingByTerms({
  isDarkMode,
  panelRef,
  palettes,
  colorMapping = { ...DEFAULT_COLOR_MAPPING_CONFIG },
  setColorMapping,
  categories,
  formatter,
  isInlineEditing,
  allowCustomMatch,
}: ColorMappingByTermsProps) {
  return (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.lens.colorMapping.editColorMappingSectionLabel', {
        defaultMessage: 'Color mapping',
      })}
      css={{ alignItems: 'center' }}
      fullWidth
    >
      <PalettePanelContainer
        siblingRef={panelRef}
        palette={getColorsFromMapping(palettes, isDarkMode, colorMapping)}
        title={i18n.translate('xpack.lens.colorMapping.editColorMappingTitle', {
          defaultMessage: 'Assign colors to terms',
        })}
        isInlineEditing={isInlineEditing}
      >
        <div
          data-test-subj="lns-palettePanel-terms"
          className="lnsPalettePanel__section lnsPalettePanel__section--shaded lnsIndexPatternDimensionEditor--padded"
        >
          <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
            <EuiFlexItem>
              <CategoricalColorMapping
                isDarkMode={isDarkMode}
                model={colorMapping}
                onModelUpdate={setColorMapping}
                specialTokens={SPECIAL_TOKENS_STRING_CONVERSION}
                palettes={palettes}
                formatter={formatter}
                allowCustomMatch={allowCustomMatch}
                data={{
                  type: 'categories',
                  categories,
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </PalettePanelContainer>
    </EuiFormRow>
  );
}
