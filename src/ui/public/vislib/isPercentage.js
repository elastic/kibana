import { SCALE_MODES } from '../vis/scale_modes';

export function isPercentage(aggConfigId, seriesParams, valueAxes) {
  const dataSeries = seriesParams.find((dataSeries) => dataSeries.data.id === aggConfigId);
  if (!dataSeries) {
    return false;
  }
  const valueAxis = valueAxes.find((valueAxis) => valueAxis.id === dataSeries.valueAxis);
  return (valueAxis) ? valueAxis.scale.mode === SCALE_MODES.PERCENTAGE : false;
}
