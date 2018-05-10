
export function stripRequest(requestString) {
  return requestString.trim().replace(/\n|\r/g, '').replace(/\s+/g, '');
}

export function testSubjectifySelector(selector, strategy) {
  return strategy === 'xpath' ? `[@data-test-subj="${selector}"]` : `[data-test-subj="${selector}"]`;
}
