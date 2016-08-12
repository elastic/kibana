function monitorStateChanges(state, handlerFn, cleanupFn) {
  if (typeof handlerFn !== 'function') throw new Error('second argument must be a listener function');
  if (typeof cleanupFn !== 'function') throw new Error('third argument must be a cleanup function');

  const deletegateHandler = (type) => (keys) => handlerFn(type, keys);
  const saveHandler = deletegateHandler('save_with_changes');
  const resetHandler = deletegateHandler('reset_with_changes');
  const fetchHandler = deletegateHandler('fetch_with_changes');

  state.on('save_with_changes', saveHandler);
  state.on('reset_with_changes', resetHandler);
  state.on('fetch_with_changes', fetchHandler);

  function unlisten() {
    state.off('save_with_changes', saveHandler);
    state.off('reset_with_changes', resetHandler);
    state.off('fetch_with_changes', fetchHandler);
  }
  cleanupFn(unlisten);
}

export default monitorStateChanges;