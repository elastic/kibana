const tooltipFormatter = (event) => {
  const getValue = (agg) => {
    if (agg.value === 'y') {
      return agg.formatter ? agg.formatter(event.point.y || event.point) : event.point.y || event.point;
    } else if (agg.value === 'x') {
      return agg.formatter ? agg.formatter(event.point.x) : event.point.x;
    } else if (agg.value === 'x_as_string') {
      return agg.formatter ? agg.formatter(event.point.x_as_string) : event.point.x_as_string;
    } else if (agg.value === 'val') {
      return event.point.val;
    } else {
      return agg.value;
    }
  };
  if (!event.aggs) return;
  const aggs = event.aggs.map(agg => {
    const value = getValue(agg);
    return `<tr><td class="tooltip-label">${agg.label}</td><td class="tooltip-value">${value}</td></tr>`;
  }).join('');
  return '<table>' + aggs + '</table>';
};

export { tooltipFormatter };
