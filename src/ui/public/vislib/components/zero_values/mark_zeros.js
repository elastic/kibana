/**
 * Add a flag to the series values to mark those which the y coordinate is zero.
 */
export function markZeros(obj) {
  obj.forEach(function (series) {
    series.values.forEach(value => {
      if (value.y === 0) {
        value.isZero = true;
      }
    });
  });

  return obj;
}
