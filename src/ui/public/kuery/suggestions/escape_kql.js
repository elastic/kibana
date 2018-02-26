// See the SpecialCharacter rule in kql.peg
export function escapeKql(string) {
  return string.replace(/[\\():<>"*]/g, '\\$&'); // $& means the whole matched string
}
