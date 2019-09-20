# integration-test
Full stack integration test repo

The Unified Release Process runs on https://internal-ci.elastic.co/ and the jobs named like

`elastic / stack # master - unified snapshot` trigger integration test jobs like `elastic / integration-test # master`

## configs

*Name* | *distribution* | *license* | *security* 
-------|------------|-----------|------------
centos6_rpm_oss | OSS | N/A | no 
centos7_rpm | default | Basic | enabled 
ubuntu18_deb_oidc | default | Trial | OpenID Connect 
ubuntu18_docker | default | Trial | enabled 
ubuntu16_deb_desktop_saml | default | Trial | SAML 
ubuntu16_tar_ccs | default | Trial | enabled 
ubuntu16_tar | default | Trial | enabled 
ubuntu16_tar_oss | OSS | N/A | no 
w2012_ie | default | Trial | enabled
w2016_zip_oss | OSS | N/A | no 
debian-9_deb_oss | OSS | N/A | no 


## Setting Up Your Environment

* Install vagrant 1.9.7 and the software for the provider you want to use (default is VirtualBox 5.1.30)
It also should support VMware, Docker and Hyper-V.
For the Windows VMs you also need `vagrant plugin install winrm`

* Install the version of node.js listed in the .node-version file (this can be easily automated with tools such as nvm and avn).  On Windows you can just download and install the version of node.js from https://nodejs.org/en/

	`nvm install "$(cat .node-version)"`

* Running `jenkins_test.sh`.  This script is used both by the Jenkins jobs and to run locally.

```
jenkins_test.sh Usage:

This script detects if a WORKSPACE variable exists and if it does,
runs like a Jenkins job, else, runs like a local job.

One difference is that local jobs save a snapshot of the VM after
phase1 (download and install) is complete.
This allows faster debugging using MODE=restore.  With this setting
the VM is restored and then phase2 (configuring and starting),
then Selenium tests are run

PARAMETERS: (these are actually environment variables that can be set before starting jenkins_test.sh)

BUILD - Can include a SNAPSHOT (pulls from snapshots.elastic.co)
        or staging build hash (pulls from staging.elastic.co).
        If neither of those match, then it's assumed to be a released build (pulls from artifacts.elastic.co)
        Examples: 6.0.0-rc2-SNAPSHOT, 6.0.0-rc2-abcd1234, 6.0.0-rc1
      * Default value if not specified is the current SNAPSHOT of this 6.0 branch "6.0.0-rc2-SNAPSHOT"

VMS   - VM name or list of VM names
      * Default for local runs is "centos_rpm_NoXpack ubuntu_tar_ccs centos_rpm w2012_zip ubuntu_deb"

MODE  - [restore] optional MODE=restore will revert your current VM to the phase1 snapshot

Examples:
         ./jenkins_test.sh                                  Runs all VMs one after another on the current SNAPSHOT build
         VMS=w2012_zip ./jenkins_test.sh                    Runs the Windows 2012 Server VM on the current SNAPSHOT build
         VMS=w2012_zip BUILD=6.0.0-rc1 ./jenkins_test.sh    Runs the Windows 2012 Server VM on the 6.0.0-rc1 released build
         VMS=w2012_zip MODE=restore ./jenkins_test.sh       Restores the Windows VM to phase1 and continues from that point
```

* These tests can also be run directly in a VM or on a AWS or GCP machine by running `./phase1.sh` and `phase2.sh`


## Upgrade Testing
There are several additional scripts that can be run from the VM host (your laptop) to do individual steps of an upgrade from 5.6.0 to 6.0.0 on **Ubuntu only** (for now).

The steps are;
  1. check `qa/setenv.sh for your 5.6.0 build (snapshot, staging build, or released build)
  2. check `qa/setenv.sh` for your 6.0.0-beta1 to make sure your installing the correct version (`UPGRADE_VERSION`, `UPGRADE_HASH`, `UPGRADE_BASEURL`) **Snapshots can only be upgraded to snapshot builds.  Staging or release builds can be upgraded to staging or released builds.  So don't mix snapshots and non-snapshot builds because their licenses are not compatible**
  3. run `./run.sh ubuntu`
  4. let the entire script run through creating the VM, installing the 5.6.0 stack, configuring, starting, and running the Selenium tests.  Please check that your Monitoring page shows Logstash monitoring data.
  5. take a snapshot like this;  `vagrant snapshot save ubuntu ubuntu-phase2`
  6. manually use the `Upgrade Assistant` UI in Kibana to run the `Cluster Checkup` and `Reindex Helper`
  6b. get the 6.0.0-beta1 .deb packages;
 `vagrant ssh ubuntu -c "cd /vagrant/qa/; sudo /vagrant/qa/get6.0.0.sh"  -- -T`
  7. upgrade elasticsearch;
 `vagrant ssh ubuntu -c "cd /vagrant/qa/; sudo /vagrant/qa/upgrade_elasticsearch.sh"  -- -T`
  8. check that Kibana 5.6.0 connects OK to the Elasticsearch 6.0.0-beta1 you just upgraded it to (for me, the logstash index showed an error in the UI alone-  in the Cluster Checkup but seemed to work fine in Discover in this mixed version configuration.  And the beats all looked fine in Cluster Checkup but showed errors in Discover).
<img width="1158" alt="screen shot 2017-08-10 at 9 59 17 am" src="https://user-images.githubusercontent.com/11466284/29182143-9e950c7e-7db2-11e7-8058-cab80791188d.png">

  9. upgrade Kibana (of course this is going to take a few minutes for the optimizing step);
 `vagrant ssh ubuntu -c "cd /vagrant/qa/; sudo /vagrant/qa/upgrade_kibana.sh"  -- -T`
  10.  Logstash and beats data should work OK in Discover now
  11. upgrade logstash
`vagrant ssh ubuntu -c "cd /vagrant/qa/; sudo /vagrant/qa/upgrade_logstash.sh"  -- -T`
  12. check that you're getting new logstash docs in discover and that Monitoring Logstash is working
  13. upgrade beats
`vagrant ssh ubuntu -c "cd /vagrant/qa/; sudo /vagrant/qa/upgrade_beats.sh"  -- -T`
  14. check that you're getting new beats data


In the Cloud test scenario below, the VM provision script sees that the ESHOST (from the ESURL) is not `localhost` and will only download and install the beats and logstash so that they can be configured to write to the Cloud Elasticsearch instance.  Once the products are installed, configured, and started in the VM, the Selenium UI tests are started on the host (not on the headless VM).

## Running tests against a Cloud instance of Elasticsearch and Kibana

 1. Prior to a release, the new version is available on https://cloud-staging.elastic.co/.
 2. Create a new cluster
 ![image](https://cloud.githubusercontent.com/assets/13542669/22360191/39fe5998-e413-11e6-8fd5-491dc02f8734.png)
 3. Make sure to set the version;

 ![image](https://cloud.githubusercontent.com/assets/13542669/22360208/5bb76494-e413-11e6-8626-cd410a7a841a.png)
 4. Possibly set `User Settings` yml to add an email account for watcher (come back to this)
 5. Name the cluster whatever you want (not used by the tests) and click `Create`;
 ![image](https://cloud.githubusercontent.com/assets/13542669/22360235/b35c333c-e413-11e6-898f-33d8cc9d927e.png)
 6. **Make sure to save the password that appears in a pop-up**
 ![image](https://cloud.githubusercontent.com/assets/13542669/22360270/f35e4808-e413-11e6-8874-23c6b7cf89f3.png)
 7.Click on Configuration;
 ![image](https://cloud.githubusercontent.com/assets/13542669/22360302/3304d6a2-e414-11e6-9e2c-7d3888163eb5.png)
 8. Enable Kibana;
 ![image](https://cloud.githubusercontent.com/assets/13542669/22360327/5672fe16-e414-11e6-901c-030c5530a537.png)
 9. Select your new cluster in the Monitoring Taget Cluster list and click `Update`;
 ![image](https://cloud.githubusercontent.com/assets/13542669/22360368/92575706-e414-11e6-8085-0ca997c77cb3.png)
 10. Go back to `Overview` and copy the links
```
Endpoints
HTTPS	https://4e97ee8064d78faf496bd7457cb33006.us-east-1.aws.found.io:9243
Kibana	https://eb7cd9d6c1fbc026121fe3119499db53.us-east-1.aws.found.io
```
 11. To run these integration tests against the Cloud instance you need to set the Elasticsearch and Kibana fully qualified URLs as environment variables on the command line with the `username:password@` and the Kibana HTTPS port 443 appended to the Kibana URL.
 The syntax is:
 ```
 ESURL=<protocol>://<username>:<password>@<elasticsearch hostname>:<port> KIBANAURL=<protocol>://<username>:<password>@<kibana hostname>:<port> ./jenkins_test.sh`
 ```

 Example:
 ```
 ESURL=https://elastic:6NY1d6BDKpz8N1Do9qhtksnr@4e97ee8064d78faf496bd7457cb33006.us-east-1.aws.found.io:9243 KIBANAURL=https://elastic:6NY1d6BDKpz8N1Do9qhtksnr@eb7cd9d6c1fbc026121fe3119499db53.us-east-1.aws.found.io:443 ./jenkins_test.sh
 ```
