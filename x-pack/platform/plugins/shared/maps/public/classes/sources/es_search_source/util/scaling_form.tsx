/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment, ReactNode } from 'react';
import {
  EuiConfirmModal,
  EuiFormRow,
  EuiRadio,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getIndexPatternService } from '../../../../kibana_services';
import {
  DEFAULT_MAX_RESULT_WINDOW,
  LAYER_TYPE,
  SCALING_TYPES,
} from '../../../../../common/constants';
import { loadIndexSettings } from './load_index_settings';
import { OnSourceChangeArgs } from '../../source';
import { ScalingDocumenationPopover } from './scaling_documenation_popover';

interface Props {
  filterByMapBounds: boolean;
  indexPatternId: string;
  onChange: (args: OnSourceChangeArgs) => void;
  scalingType: SCALING_TYPES;
  supportsClustering: boolean;
  clusteringDisabledReason?: string | null;
  hasSpatialJoins: boolean;
  numberOfJoins: number;
}

interface State {
  nextScalingType?: SCALING_TYPES;
  maxResultWindow: string;
  showModal: boolean;
  modalContent: ReactNode;
}

export class ScalingForm extends Component<Props, State> {
  state: State = {
    maxResultWindow: DEFAULT_MAX_RESULT_WINDOW.toLocaleString(),
    modalContent: null,
    showModal: false,
  };
  _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
    this.loadIndexSettings();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async loadIndexSettings() {
    try {
      const dataView = await getIndexPatternService().get(this.props.indexPatternId);
      const { maxResultWindow } = await loadIndexSettings(dataView.getIndexPattern());
      if (this._isMounted) {
        this.setState({ maxResultWindow: maxResultWindow.toLocaleString() });
      }
    } catch (err) {
      return;
    }
  }

  _onScalingTypeSelect = (optionId: SCALING_TYPES): void => {
    if (this.props.numberOfJoins > 0 && optionId === SCALING_TYPES.CLUSTERS) {
      this._openModal(optionId, [
        i18n.translate('xpack.maps.source.esSearch.clusterScalingJoinMsg', {
          defaultMessage: `Scaling with clusters does not support joins. Switching to clusters will remove all joins from your layer configuration.`,
        }),
      ]);
      return;
    }

    if (optionId === SCALING_TYPES.MVT) {
      const messages: string[] = [];
      if (this.props.hasSpatialJoins) {
        messages.push(
          i18n.translate('xpack.maps.source.esSearch.mvtNoSpatialJoinMsg', {
            defaultMessage: `Vector tiles do not support spatial joins. Switching to vector tiles will remove all spatial joins from your layer configuration.`,
          })
        );
      }

      if (this.props.numberOfJoins > 1) {
        messages.push(
          i18n.translate('xpack.maps.source.esSearch.mvtScalingJoinMsg', {
            defaultMessage: `Vector tiles support one term join. Your layer has {numberOfJoins} joins. Switching to vector tiles will keep the first term join and remove all other joins from your layer configuration.`,
            values: {
              numberOfJoins: this.props.numberOfJoins,
            },
          })
        );
      }

      if (messages.length) {
        this._openModal(optionId, messages);
        return;
      }
    }

    this._onScalingTypeChange(optionId);
  };

  _onScalingTypeChange = (optionId: SCALING_TYPES): void => {
    let layerType;
    if (optionId === SCALING_TYPES.CLUSTERS) {
      layerType = LAYER_TYPE.BLENDED_VECTOR;
    } else if (optionId === SCALING_TYPES.MVT) {
      layerType = LAYER_TYPE.MVT_VECTOR;
    } else {
      layerType = LAYER_TYPE.GEOJSON_VECTOR;
    }

    this.props.onChange({ propName: 'scalingType', value: optionId, newLayerType: layerType });
  };

  _onFilterByMapBoundsChange = (event: EuiSwitchEvent) => {
    this.props.onChange({ propName: 'filterByMapBounds', value: event.target.checked });
  };

  _openModal = (optionId: SCALING_TYPES, messages: string[]) => {
    this.setState({
      modalContent: messages.length
        ? messages.map((message, index) => {
            return <p key={index}>{message}</p>;
          })
        : null,
      nextScalingType: optionId,
      showModal: true,
    });
  };

  _closeModal = () => {
    this.setState({
      modalContent: null,
      nextScalingType: undefined,
      showModal: false,
    });
  };

  _acceptModal = () => {
    if (this.state.nextScalingType) {
      this._onScalingTypeChange(this.state.nextScalingType);
    }
    this._closeModal();
  };

  _getLimitOptionLabel() {
    return i18n.translate('xpack.maps.source.esSearch.limitScalingLabel', {
      defaultMessage: 'Limit results to {maxResultWindow}',
      values: { maxResultWindow: this.state.maxResultWindow },
    });
  }

  _getClustersOptionLabel() {
    return i18n.translate('xpack.maps.source.esSearch.clusterScalingLabel', {
      defaultMessage: 'Show clusters when results exceed {maxResultWindow}',
      values: { maxResultWindow: this.state.maxResultWindow },
    });
  }

  _getMvtOptionLabel() {
    return i18n.translate('xpack.maps.source.esSearch.useMVTVectorTiles', {
      defaultMessage: 'Use vector tiles',
    });
  }

  _renderModal() {
    if (
      !this.state.showModal ||
      !this.state.modalContent ||
      this.state.nextScalingType === undefined
    ) {
      return null;
    }

    return (
      <EuiConfirmModal
        title={i18n.translate('xpack.maps.source.esSearch.scalingModal.title', {
          defaultMessage: `Remove unsupported configurations?`,
        })}
        onCancel={this._closeModal}
        onConfirm={this._acceptModal}
        cancelButtonText={i18n.translate('xpack.maps.source.esSearch.scalingModal.cancelBtnLabel', {
          defaultMessage: 'Cancel',
        })}
        confirmButtonText={i18n.translate(
          'xpack.maps.source.esSearch.scalingModal.confirmBtnLabel',
          {
            defaultMessage: 'Accept',
          }
        )}
        buttonColor="danger"
        defaultFocusedButton="cancel"
      >
        {this.state.modalContent}
      </EuiConfirmModal>
    );
  }

  _renderClusteringRadio() {
    const clusteringRadio = (
      <EuiRadio
        id={SCALING_TYPES.CLUSTERS}
        label={this._getClustersOptionLabel()}
        checked={this.props.scalingType === SCALING_TYPES.CLUSTERS}
        onChange={() => this._onScalingTypeSelect(SCALING_TYPES.CLUSTERS)}
        disabled={!this.props.supportsClustering}
      />
    );

    return this.props.clusteringDisabledReason ? (
      <EuiToolTip position="left" content={this.props.clusteringDisabledReason}>
        {clusteringRadio}
      </EuiToolTip>
    ) : (
      clusteringRadio
    );
  }

  render() {
    let filterByBoundsSwitch;
    if (this.props.scalingType === SCALING_TYPES.LIMIT) {
      filterByBoundsSwitch = (
        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate('xpack.maps.source.esSearch.extentFilterLabel', {
              defaultMessage: 'Dynamically filter for data in the visible map area',
            })}
            checked={this.props.filterByMapBounds}
            onChange={this._onFilterByMapBoundsChange}
            compressed
          />
        </EuiFormRow>
      );
    }

    return (
      <Fragment>
        {this._renderModal()}
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage id="xpack.maps.esSearch.scaleTitle" defaultMessage="Scaling" />{' '}
            <ScalingDocumenationPopover
              limitOptionLabel={this._getLimitOptionLabel()}
              clustersOptionLabel={this._getClustersOptionLabel()}
              maxResultWindow={this.state.maxResultWindow}
              mvtOptionLabel={this._getMvtOptionLabel()}
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFormRow>
          <div>
            <EuiRadio
              id={SCALING_TYPES.MVT}
              label={this._getMvtOptionLabel()}
              checked={this.props.scalingType === SCALING_TYPES.MVT}
              onChange={() => this._onScalingTypeSelect(SCALING_TYPES.MVT)}
            />
            {this._renderClusteringRadio()}
            <EuiRadio
              id={SCALING_TYPES.LIMIT}
              label={this._getLimitOptionLabel()}
              checked={this.props.scalingType === SCALING_TYPES.LIMIT}
              onChange={() => this._onScalingTypeSelect(SCALING_TYPES.LIMIT)}
            />
          </div>
        </EuiFormRow>

        {filterByBoundsSwitch}
      </Fragment>
    );
  }
}
