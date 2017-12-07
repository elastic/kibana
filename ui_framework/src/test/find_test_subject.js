// Extract the DOM node which matches a specific test subject selector.
export const findTestSubject = (mountedComponent, testSubjectSelector, isDOMNode = true) => {
  const testSubject = mountedComponent.find(`[data-test-subj="${testSubjectSelector}"]`);

  if (isDOMNode) {
    return testSubject.hostNodes().getDOMNode();
  }

  return testSubject.hostNodes();
};
