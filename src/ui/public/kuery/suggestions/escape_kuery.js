export function escapeQuotes(string) {
  return string.replace(/"/g, '\\"');
}

export const escapeKuery = (string) => escapeKeywords(escapeSpecialCharacters(string));

// See the SpecialCharacter rule in kuery.peg
function escapeSpecialCharacters(string) {
  return string.replace(/[\\():<>"*]/g, '\\$&'); // $& means the whole matched string
}

// See the Keyword rule in kuery.peg
function escapeKeywords(string) {
  return string.replace(/(\s+)(and|or|not)(\s+)/ig, '$1\\$2$3');
}
