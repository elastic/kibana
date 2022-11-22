# Node Roles Basic Feature Test
### Tracking Doc Link

https://docs.google.com/document/d/1-NaxLRUZNRz5ZVG2IZz48uKIquDMBIpiATO1OL3pNAs/edit

## Basic feature test / exploring gateway + test setup:

Test: run an 8.5 local cluster with 2 process nodes and see Kibana + rules running ok in 8.5.  
Details:  
 - create a few rules and see Alerts show up in Kibana with actions posting to Slack or email or any easy service
 - create a report and make sure it runs, nothing fancy is required for this functional side test.
   - This is also where/when we can do some exploratory testing… 
      - What happens with local kibana crash or restart
- What else?
   - Question:  What other Kibana .yml options could interplay or interfere with the process(es) running?    
     - TBD if any, good to think and play with it.  

## Dependencies

Currently, its only running on my local mac.

After running `packages/kbn-health-gateway-server/scripts/setup_docker_compose_locally.sh` and changing 
the certificate paths (to point to your our dev certs, perhaps `packages/kbn-dev-utils/certs`) you must turn on the Docker Daemon (Docker Desktop) to run these tests.