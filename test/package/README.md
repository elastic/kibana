# Package Testing

Packaging tests use Vagrant virtual machines as hosts and Ansible for provisioning and assertions. Kibana distributions are copied from the target folder into each VM and installed, along with required dependencies.

## Setup

- [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)

  ```
  # Ubuntu
  sudo apt-get install python3-pip libarchive-tools
  pip3 install --user ansible

  # Darwin
  brew install python3
  pip3 install --user ansible
  ```

- [ansible.posix.firewalld](https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html)
  ```
  ansible-galaxy collection install ansible.posix
  ```
- [Vagrant](https://www.vagrantup.com/downloads)
- [Virtualbox](https://www.virtualbox.org/wiki/Downloads)

## Machines

| Hostname | IP           | Description                           |
| -------- | ------------ | ------------------------------------- |
| deb      | 192.168.50.5 | Installation of Kibana's deb package  |
| rpm      | 192.168.50.6 | Installation of Kibana's rpm package  |
| docker   | 192.168.50.7 | Installation of Kibana's docker image |

## Running

```
# Build distributions
node scripts/build --all-platforms --debug --no-oss

cd test/package

# Setup virtual machine and networking
vagrant up <hostname> --no-provision

# Install Kibana and run OS level tests
# This step can be repeated when adding new tests, it ensures machine state - installations won't run twice
vagrant provision <hostname>

# Running functional tests
node scripts/es snapshot \
  -E network.bind_host=127.0.0.1,192.168.50.1 \
  -E discovery.type=single-node \
  --license=trial
TEST_KIBANA_URL=http://elastic:changeme@<ip>:5601 \
TEST_ES_URL=http://elastic:changeme@192.168.50.1:9200 \
  node scripts/functional_test_runner.js --include-tags=smoke

```

## Cleanup

```
vagrant destroy <hostname>
```
