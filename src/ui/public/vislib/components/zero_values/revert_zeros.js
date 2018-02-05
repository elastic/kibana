/**
 * Set the y coordinate of values with the flag isZero to 0.
 */
export function revertZeros(obj) {
  obj.forEach(function (series) {
    series.values.forEach(value => {
      if (value.isZero) {
        value.y = 0;
      }
    });
  });

  return obj;
}
