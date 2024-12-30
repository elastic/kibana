/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiAccordion, EuiLink, EuiSkeletonText, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataFilters } from '../../../../common/descriptor_types';
import { ImmutableSourceProperty, ISource } from '../../../classes/sources/source';

export interface Props {
  source: ISource;
  dataFilters: DataFilters;
}

export function SourceDetails(props: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [sourceProperties, setSourceProperties] = useState<ImmutableSourceProperty[]>([]);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    props.source.getImmutableProperties(props.dataFilters).then((nextSourceProperties) => {
      if (!ignore) {
        setSourceProperties(nextSourceProperties);
        setIsLoading(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, [props.dataFilters, props.source]);

  return (
    <div className="mapLayerPanel__sourceDetails">
      <EuiAccordion
        id="accordion1"
        buttonContent={i18n.translate('xpack.maps.layerPanel.sourceDetailsLabel', {
          defaultMessage: 'Source details',
        })}
      >
        <EuiSpacer size="xs" />
        <EuiSkeletonText lines={3} size="s" isLoading={isLoading}>
          <EuiText color="subdued" size="s">
            {sourceProperties.map(({ label, value, link }: ImmutableSourceProperty) => {
              return (
                <p key={label} className="mapLayerPanel__sourceDetail">
                  <strong>{label}</strong>{' '}
                  {link ? (
                    <EuiLink href={link} target="_blank">
                      {value}
                    </EuiLink>
                  ) : (
                    <span>{value}</span>
                  )}
                </p>
              );
            })}
          </EuiText>
        </EuiSkeletonText>
      </EuiAccordion>
    </div>
  );
}
