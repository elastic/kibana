import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';

export function TooltipTab(props) {

  const findVisualizations = (input, callback) => {
    props.scope.vis.API.savedObjectsClient.find({
      type: ['visualization'],
      fields: ['title'],
      search: `${input}*`,
      search_fields: ['title^3', 'description'],
      perPage: 100
    })
    .then((resp) => {
      const options = resp.savedObjects.map((savedObject) => {
        return {
          label: savedObject.attributes.title,
          value: savedObject.id
        };
      });
      callback(null, { options: options });
    });
  };

  const setTooltipParam = (paramName, paramValue) => {
    const params = _.cloneDeep(props.scope.vis.params);
    params.tooltip[paramName] = paramValue;
    props.stageEditorParams(params);
  };

  const handleTypeChange = (evt) => {
    setTooltipParam('type', evt.target.value);
  };

  const handleVisChange = (evt) => {
    setTooltipParam('vis', evt.value);
  };

  const handleHeightChange = (evt) => {
    setTooltipParam('height', parseFloat(evt.target.value));
  };

  const handleWidthChange = (evt) => {
    setTooltipParam('width', parseFloat(evt.target.value));
  };

  const renderDimensionInputs = () => {
    return (
      <div>
        <div className="kuiSideBarFormRow">
          <label className="kuiSideBarFormRow__label" htmlFor="tooltipHeight">
            Height
          </label>
          <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
            <input
              id="tooltipHeight"
              className="kuiTextInput"
              type="number"
              min="100"
              max={window.innerHeight}
              value={props.scope.vis.params.tooltip.height}
              onChange={handleHeightChange}
            />
          </div>
        </div>

        <div className="kuiSideBarFormRow">
          <label className="kuiSideBarFormRow__label" htmlFor="tooltipWidth">
            Width
          </label>
          <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
            <input
              id="tooltipWidth"
              className="kuiTextInput"
              type="number"
              min="100"
              max={window.innerWidth}
              value={props.scope.vis.params.tooltip.width}
              onChange={handleWidthChange}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderVisSelect = () => {
    const visSelectId = 'tooltipVisualization';
    return (
      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor={visSelectId}>
          Visualization
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <Select.Async
            className="vis-react-select"
            placeholder="Select..."
            value={props.scope.vis.params.tooltip.vis}
            loadOptions={findVisualizations}
            onChange={handleVisChange}
            resetValue={''}
            inputProps={{ id: visSelectId }}
          />
        </div>
      </div>
    );
  };

  let dimensionInputs = null;
  let visSelect = null;
  if (props.scope.vis.params.tooltip.type === 'vis') {
    dimensionInputs = renderDimensionInputs();
    visSelect = renderVisSelect();
  }

  return (
    <div className="sidebar-item">

      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor="tooltipType">
          Tooltip
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <select
            id="tooltipType"
            className="kuiSelect"
            value={props.scope.vis.params.tooltip.type}
            onChange={handleTypeChange}
          >
            <option value="metric">Metric</option>
            <option value="vis">Visualization</option>
          </select>
        </div>
      </div>

      {visSelect}

      {dimensionInputs}

    </div>
  );
}

TooltipTab.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
