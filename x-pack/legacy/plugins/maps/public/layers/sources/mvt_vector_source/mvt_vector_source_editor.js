import React, {Fragment} from "react";
import _ from "lodash";
import {EuiFieldText, EuiFormRow} from "@elastic/eui";
import {i18n} from "@kbn/i18n";

export class MVTVectorSourceEditor extends React.Component {
  state = {
    mvtInput: '',
    mvtCanPreview: false,
  };

  _sourceConfigChange = _.debounce(updatedSourceConfig => {
    if (this.state.mvtCanPreview) {
      this.props.onSourceConfigChange(updatedSourceConfig);
    }
  }, 2000);

  _handleMVTInputChange(e) {
    const url = e.target.value;

    const canPreview =
      url.indexOf('{x}') >= 0 && url.indexOf('{y}') >= 0 && url.indexOf('{z}') >= 0;
    this.setState(
      {
        mvtInput: url,
        mvtCanPreview: canPreview,
      },
      () => this._sourceConfigChange({ urlTemplate: url })
    );
  }

  render() {
    const example = `http://localhost:8080/?x={x}&y={y}&z={z}&index=ky_roads&geometry=geometry&size=10000&fields=fclass`;
    return (
      <Fragment>
        <div>{example}</div>
        <EuiFormRow label="Url">
          <EuiFieldText
            value={``}
            onChange={e => this._handleMVTInputChange(e)}
          />
        </EuiFormRow>
      </Fragment>
    );
  }
}
