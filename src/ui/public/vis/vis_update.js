const updateVisualizationConfig = (stateConfig, config) => {

  if (config.type === 'gauge' && config.fontSize) {
    config.gauge.style.fontSize = config.fontSize;
    delete config.fontSize;
  }

  // update old metric to the new one
  if (config.type === 'gauge' && config.gauge.gaugeType === 'Metric') {
    config.type = 'metric';
    config.metric = config.gauge;
    delete config.gauge;
    delete config.metric.gaugeType;
    delete config.metric.gaugeStyle;
    delete config.metric.backStyle;
    delete config.metric.scale;
    delete config.metric.type;
    delete config.metric.orientation;
    delete config.metric.verticalSplit;
    delete config.metric.autoExtend;
    config.metric.metricColorMode = config.metric.gaugeColorMode;
    delete config.metric.gaugeColorMode;
  }

  if (!stateConfig || stateConfig.seriesParams) return;
  if (!['line', 'area', 'histogram'].includes(config.type)) return;

  // update value axis options
  const isUserDefinedYAxis = config.setYExtents;
  const mode = ['stacked', 'overlap'].includes(config.mode) ? 'normal' : config.mode || 'normal';
  config.valueAxes[0].scale = {
    ...config.valueAxes[0].scale,
    type: config.scale || 'linear',
    setYExtents: config.setYExtents || false,
    defaultYExtents: config.defaultYExtents || false,
    min: isUserDefinedYAxis ? config.yAxis.min : undefined,
    max: isUserDefinedYAxis ? config.yAxis.max : undefined,
    mode: mode
  };

  // update series options
  const interpolate = config.smoothLines ? 'cardinal' : config.interpolate;
  const stacked = ['stacked', 'percentage', 'wiggle', 'silhouette'].includes(config.mode);
  config.seriesParams[0] = {
    ...config.seriesParams[0],
    type: config.type || 'line',
    mode: stacked ? 'stacked' : 'normal',
    interpolate: interpolate,
    drawLinesBetweenPoints: config.drawLinesBetweenPoints,
    showCircles: config.showCircles,
    radiusRatio: config.radiusRatio
  };
};

export { updateVisualizationConfig };
