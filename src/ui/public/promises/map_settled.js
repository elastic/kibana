
export function promiseMapSettled(promises, func, PromiseClass = Promise) {
  return new PromiseClass((resolve) => {
    const results = new Array(promises.length);
    let counter = 0;

    const checkFinished = () => {
      if (counter === promises.length) {
        resolve(results);
      }
    };

    const storeResult = (index, result) => {
      results[index] = result;
      counter++;
      checkFinished();
    };

    promises.forEach((promise, index) => {
      func(promise).then((resolved) => {
        storeResult(index, { resolved });
      })
        .catch((rejected) => {
          storeResult(index, { rejected });
        });
    });
  });
}
