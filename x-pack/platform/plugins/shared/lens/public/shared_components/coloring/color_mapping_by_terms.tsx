/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MutableRefObject, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
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
import { FormattedMessage } from '@kbn/i18n-react';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';
import { PalettePicker } from '../palette_picker';
import { PalettePanelContainer } from './palette_panel_container';
import { getPaletteDisplayColors } from './utils';

interface ColorMappingByTermsProps {
  isDarkMode: boolean;
  colorMapping?: ColorMapping.Config;
  palette?: PaletteOutput<CustomPaletteParams>;
  palettes: KbnPalettes;
  isInlineEditing?: boolean;
  setPalette: (palette: PaletteOutput) => void;
  setColorMapping: (colorMapping?: ColorMapping.Config) => void;
  paletteService: PaletteRegistry;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  categories: SerializedValue[];
  formatter?: IFieldFormat;
  allowCustomMatch?: boolean;
}

export function ColorMappingByTerms({
  isDarkMode,
  colorMapping,
  palette,
  palettes,
  isInlineEditing,
  setPalette,
  setColorMapping,
  paletteService,
  panelRef,
  categories,
  formatter,
  allowCustomMatch,
}: ColorMappingByTermsProps) {
  const { euiTheme } = useEuiTheme();
  const [useLegacyPalettes, setUseLegacyPalettes] = useState(!colorMapping);

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
        palette={getPaletteDisplayColors(
          paletteService,
          palettes,
          isDarkMode,
          palette,
          colorMapping
        )}
        siblingRef={panelRef}
        title={
          !useLegacyPalettes
            ? i18n.translate('xpack.lens.colorMapping.editColorMappingTitle', {
                defaultMessage: 'Assign colors to terms',
              })
            : i18n.translate('xpack.lens.colorMapping.editColorsTitle', {
                defaultMessage: 'Edit colors',
              })
        }
        isInlineEditing={isInlineEditing}
      >
        <div
          data-test-subj="lns-palettePanel-terms"
          className="lnsPalettePanel__section lnsPalettePanel__section--shaded lnsIndexPatternDimensionEditor--padded"
        >
          <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
            <EuiFlexItem>
              <EuiSwitch
                label={
                  <EuiText size="xs">
                    <span>
                      {i18n.translate('xpack.lens.colorMapping.legacyLabel', {
                        defaultMessage: 'Use legacy palettes',
                      })}{' '}
                      {(colorMapping?.assignments.length ?? 0) > 0 && (
                        <EuiIconTip
                          content={i18n.translate(
                            'xpack.lens.colorMapping.helpIncompatibleFieldDotLabel',
                            {
                              defaultMessage: 'Disabling Color Mapping will clear all assignments',
                            }
                          )}
                          position="top"
                          size="s"
                          type="dot"
                          color={euiTheme.colors.warning}
                        />
                      )}{' '}
                      <EuiIconTip
                        color="subdued"
                        content={
                          <FormattedMessage
                            id="xpack.lens.colorMapping.legacyPalettes"
                            defaultMessage="Legacy palettes will be replaced by the new color assignment experience in a future version."
                          />
                        }
                        iconProps={{
                          className: 'eui-alignTop',
                        }}
                        position="top"
                        size="s"
                        type="question"
                      />
                    </span>
                  </EuiText>
                }
                data-test-subj="lns_colorMappingOrLegacyPalette_switch"
                compressed
                checked={useLegacyPalettes}
                onChange={({ target: { checked } }) => {
                  const newColorMapping = checked
                    ? undefined
                    : palette
                    ? getConfigFromPalette(palettes, palette.name)
                    : { ...DEFAULT_COLOR_MAPPING_CONFIG };

                  trackUiCounterEvents(`color_mapping_switch_${checked ? 'disabled' : 'enabled'}`);
                  setColorMapping(newColorMapping);
                  setUseLegacyPalettes(checked);
                }}
              />
              <EuiSpacer size="s" />
            </EuiFlexItem>
            <EuiFlexItem>
              {!useLegacyPalettes ? (
                <CategoricalColorMapping
                  isDarkMode={isDarkMode}
                  model={colorMapping ?? { ...DEFAULT_COLOR_MAPPING_CONFIG }}
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
              ) : (
                <PalettePicker
                  palettes={paletteService}
                  activePalette={palette}
                  setPalette={setPalette}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </PalettePanelContainer>
    </EuiFormRow>
  );
}
