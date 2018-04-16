// Super hacky... Need to look for a better way to accomplish this...
// When we write to Elastic, we can't always query it immediately, as
// the written document is not always immediately available. waitForActiveShards='all',
// however, times out. So, this is the interim solution.
export async function waitUntilExists(fn, count = 0) {
  const { error } = await checkExists(fn);
  if (!error) {
    return;
  }
  if (count > 100) {
    throw error;
  }
  return new Promise(resolve => setTimeout(resolve, 100))
    .then(() => waitUntilExists(fn, count + 1));
}

async function checkExists(fn) {
  try {
    const result = await fn();
    return result ? {} : { error: new Error('Failed to wait for migration') };
  } catch (error) {
    if (error.statusCode === 404) {
      return { error };
    } else {
      throw error;
    }
  }
}
