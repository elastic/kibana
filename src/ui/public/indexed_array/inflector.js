
function upFirst(str, total) {
  return str.charAt(0).toUpperCase() + (total ? str.substr(1).toLowerCase() : str.substr(1));
}

function startsWith(str, test) {
  return str.substr(0, test.length).toLowerCase() === test.toLowerCase();
}

function endsWith(str, test) {
  const tooShort = str.length < test.length;
  if (tooShort) return;

  return str.substr(str.length - test.length).toLowerCase() === test.toLowerCase();
}

function inflector(prefix, postfix) {
  return function inflect(key) {
    let inflected;

    if (key.indexOf('.') !== -1) {
      inflected = key
        .split('.')
        .map(function (step, i) {
          return (i === 0) ? step : upFirst(step, true);
        })
        .join('');
    } else {
      inflected = key;
    }

    if (prefix && !startsWith(key, prefix)) {
      inflected = prefix + upFirst(inflected);
    }

    if (postfix && !endsWith(key, postfix)) {
      inflected = inflected + postfix;
    }

    return inflected;
  };
}

export default inflector;
