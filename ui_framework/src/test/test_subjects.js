
export function find(element, dataTestSubject) {
  return element.find(`[data-test-subj="${dataTestSubject}"]`);
}

export function getText(element, dataTestSubject) {
  return find(element, dataTestSubject).text();
}
