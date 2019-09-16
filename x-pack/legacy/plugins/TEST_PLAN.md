# Test plan process (7.4.0)

### What
Everything that is being released in the 7.4 should be tested by someone other than the person who implemented it 

### When
The first week after feature freeze (FF) all known bugs and blockers will be fixed. The test plan will begin shortly after this (typically one week after FF date)

### Prerequesites
 - Every pull request that is merged to 7.x (or backported to 7.4 after FF) must be given the label: `v7.4.0`. [These pull requests](https://github.com/search?q=user%3Aelastic+is%3Amerged+is%3Apr+author%3Adgieselaar+author%3Aogupte+author%3Aformgeist+author%3Asqren+author%3Asmith++-label%3Abackport+label%3Av7.4.0&type=Issues) will provide the basis of our test plan. 
 - Immediately before starting the test plan all relevant PRs for the release are selected and the label `apm-test-plan-7.4.0` is applied. The "assigned" field will be reset to nobody (read further why)

### Execution
 - [Find the list](https://github.com/elastic/kibana/pulls?utf8=%E2%9C%93&q=is%3Apr+label%3Av7.4.0+-label%3Atested-after-ff+no%3Aassignee+label%3Aapm-test-plan-7.4.0) of unassigned, untested issues in the test plan
 - Assign yourself to an issue as you start testing it to avoid duplicate work
 - Testing a PR can have two outcomes:
   - It worked as expected:
     - Apply `tested-after-ff` label
   - It did not work as expected: 
     - Create a new issue: 
        - Link back to the original PR
        - Add the version labels to the issue and on Zube move it to "Scheduled for release"-column
     - The original PR should be marked as tested with `tested-after-ff` (the new issue will ensure that the bug is prioritized and later tested)
   
   


