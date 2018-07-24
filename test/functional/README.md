# Tips for Writing and Stabilzing Functional Tests

Many parts of our functional test code are quite old. There are some newer mechanisms which help improve test stability. Here are some tips and best
practices for developers maintaining or adding code to this area.

## TestSubjects and Find Services

Prefer using the `testSubjects` service, secondly the `find` service, and lastly the `remote` service, for interactions with elements. Avoid as much as
possible using the `remote` service directly.

TestSubjects service is a lightweight wrapper around the find service. It should be preferred because using `data-test-subj` tags is more stable than relying on ever changing css. The `find` service is preferred over
using `remote` directly because it consolidates some stability code. Specifically:
 - Moves the mouse to an element before clicking it (which is why you should also prefer `testSubjects.click(selector)` instead of `testSubjects.find(selector).click()`)
 - Wraps the entire function in a retry
 - Tests that the element is attached to the page and not stale once it's retrieved. The basic `remote.find` does not do that and repeated
 subsequent actions on it (e.g. clicks) will fail. Hence it needs to be re-found, so to speak, before attempting another click action.

Examples:

Instead of:
```js
  const selector = '[data-test-subj="myTestSubject"]';
  await remote.findByCssSelector(selector).click();
```

do:
```js
  await testSubjects.click('myTestSubject');
```

Instead of:
```js
  const selector = '[data-test-subj="myTestSubject"]';
  await remote.findByCssSelector(selector).getVisibleText();
```

do:
```js
  await testSubjects.getVisibleText('myTestSubject');
```

If your element doesn't have a `data-test-subj`, first, try to add one. If that's not feasible, use the find service.

Instead of:
```js 
  return await remote.setFindTimeout(defaultFindTimeout)
    .findAllByCssSelector('table.euiTable tbody tr.euiTableRow td.euiTableRowCell:first-child');
```

do:
```js
  return await find.allByCssSelector('table.euiTable tbody tr.euiTableRow td.euiTableRowCell:first-child');
```

Many of the functions on `remote` are available both in `testSubjects` service and the `find` service. If any are missing, please
add them using the existing functions as an example.  Try your best to also have testSubjects service functions call into the find
service so the same functionality exists on both.

## Repeated test runs on Jenkins ci

Many times tests are flaky and are rarely hit. Our ci takes 2+ hours to finish a whole build. This quickly makes investigating and attempting to fix
flaky tests extremely onerous (attempt a fix, `retest` on jenkins 5 times, fails last time, repeat this 10 hour process again, trying something new).

To make this somewhat sustainable, my usual practice goes something like this:

1. Create a PR that runs your functional test suite 10 or 20x (it's not usually possible to run only the test that failed because most rely on early tests completing).

See [this commit](https://github.com/elastic/kibana/pull/18961/commits/e5bcdb4dd62db72b33cbd1f2a05b2e78eabefdf0) for an example for trigging multiple dashboard tests per ci run.  See [this commit](https://github.com/elastic/kibana/pull/20634/commits/bde1c06d7b88658cd58da77fc52f25861694c584) as an example for isolating reporting tests.  Reporting tests use custom kibana.yml configration so are set up to run outside of the standard OSS or xpack functional tests.

**Note:** Sometimes I go so far as to comment out other tests to increase the speed the jenkins ci completes.  You can see this in the second example above. Ideally we'd have a more supported way to accomplish this.

2. Run jenkins ci until the test fails. This gives you a baseline for how frequently it will fail. Say you run the suite 10x per jenkins run, then you can much more quickly say "this test fails around 1 in every 50 runs".  If it doesn't fail at this point, I will usually turn the test back on and close the flaky issue.

**Note:** you may still have to run multiple jenkins ci's because some flakiness can be dependent on the jenkins agent, browser and OS differences.

3. Once you've established a baseline for how often the test fails, you can start work on a fix. This will give you some level of confidence that your fix actually fixes the issue.

4. Once I'm relatively confident I've fixed the issue, I'll remove the extra test runs, and push for one final ci run.


