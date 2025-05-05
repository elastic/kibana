/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MutableRefObject, useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import {
  ColorMapping,
  DEFAULT_COLOR_MAPPING_CONFIG,
  CategoricalColorMapping,
  SPECIAL_TOKENS_STRING_CONVERSION,
  PaletteOutput,
  PaletteRegistry,
  CustomPaletteParams,
  getConfigFromPalette,
} from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import { KbnPalettes } from '@kbn/palettes';
import { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { SerializedValue } from '@kbn/data-plugin/common';
import { PalettePanelContainer } from './palette_panel_container';
import { getPaletteDisplayColors } from './utils';

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
  /**
   * Legacy palette, now converted to `colorMapping` if defined
   *
   * @deprecated use `colorMapping` instead
   */
  palette?: PaletteOutput<CustomPaletteParams>;
  /**
   * @deprecated use `palettes` instead
   */
  paletteService: PaletteRegistry;
  /**
   * @deprecated
   */
  setPalette?: (palette: PaletteOutput) => void;
}

export function ColorMappingByTerms({
  isDarkMode,
  panelRef,
  palettes,
  colorMapping: colorMappingConfig,
  setColorMapping,
  categories,
  formatter,
  isInlineEditing,
  allowCustomMatch,
  palette: legacyPalette,
  paletteService,
}: ColorMappingByTermsProps) {
  const colorMapping = useMemo(() => {
    if (colorMappingConfig) return colorMappingConfig;
    if (!legacyPalette) return { ...DEFAULT_COLOR_MAPPING_CONFIG };
    return getConfigFromPalette(palettes, legacyPalette.name);
  }, [colorMappingConfig, legacyPalette, palettes]);

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
        palette={getPaletteDisplayColors(
          paletteService,
          palettes,
          isDarkMode,
          legacyPalette,
          colorMapping
        )}
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
